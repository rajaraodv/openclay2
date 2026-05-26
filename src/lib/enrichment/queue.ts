import { Queue, Worker, FlowProducer } from "bullmq";
import type { Job, RedisOptions } from "bullmq";
import type {
  EnrichmentInput,
  EnrichmentJobConfig,
  WaterfallConfig,
} from "./types";
import { runWaterfall, type WaterfallContext } from "./waterfall";
import {
  createPublisher,
  publishEvent,
  cellStatusChanged,
  jobProgress,
  jobCompleted,
  jobFailed,
} from "./sse";

// ── Redis Connection ─────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/**
 * Parse a Redis URL into BullMQ-compatible RedisOptions.
 * We pass a plain options object instead of an ioredis instance to avoid
 * version mismatches between the top-level ioredis and BullMQ's bundled copy.
 */
function parseRedisOptions(): RedisOptions {
  const parsed = new URL(REDIS_URL);
  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    db: parsed.pathname ? Number(parsed.pathname.slice(1)) || 0 : 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

let _connectionOptions: RedisOptions | null = null;
function getConnectionOptions(): RedisOptions {
  if (!_connectionOptions) _connectionOptions = parseRedisOptions();
  return _connectionOptions;
}

// ── Queue (lazy) ────────────────────────────────────────────────────

let _enrichmentQueue: Queue | null = null;
export function getEnrichmentQueue(): Queue {
  if (!_enrichmentQueue) {
    _enrichmentQueue = new Queue("enrichment", {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return _enrichmentQueue;
}

export const enrichmentQueue = new Proxy({} as Queue, {
  get(_, prop) {
    return (getEnrichmentQueue() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Flow Producer (lazy) ────────────────────────────────────────────

let _flowProducer: FlowProducer | null = null;
export function getFlowProducer(): FlowProducer {
  if (!_flowProducer) {
    _flowProducer = new FlowProducer({ connection: getConnectionOptions() });
  }
  return _flowProducer;
}

export const enrichmentFlowProducer = new Proxy({} as FlowProducer, {
  get(_, prop) {
    return (getFlowProducer() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Job Data Types ───────────────────────────────────────────────────

export interface EnrichColumnJobData {
  type: "enrich_column";
  jobId: string;
  config: EnrichmentJobConfig;
  /** Resolved row IDs and their input data */
  rows: Array<{ rowId: string; input: EnrichmentInput }>;
  /** Decrypted API keys for each provider in the waterfall */
  apiKeys: Record<string, string>;
}

export interface EnrichCellJobData {
  type: "enrich_cell";
  parentJobId: string;
  jobId: string;
  tableId: string;
  columnId: string;
  rowId: string;
  input: EnrichmentInput;
  waterfallConfig: WaterfallConfig;
  apiKeys: Record<string, string>;
}

export type EnrichmentJobData = EnrichColumnJobData | EnrichCellJobData;

// ── Add Column Enrichment Job ────────────────────────────────────────

/**
 * Add a new column enrichment job to the queue.
 * This creates a parent job that spawns child jobs for each row.
 */
export async function addEnrichColumnJob(
  jobId: string,
  config: EnrichmentJobConfig,
  rows: Array<{ rowId: string; input: EnrichmentInput }>,
  apiKeys: Record<string, string>,
): Promise<void> {
  const data: EnrichColumnJobData = {
    type: "enrich_column",
    jobId,
    config,
    rows,
    apiKeys,
  };

  await enrichmentQueue.add("enrich_column", data, {
    jobId,
    priority: 1,
  });
}

// ── Worker ───────────────────────────────────────────────────────────

let _ssePublisher: ReturnType<typeof createPublisher> | null = null;
function getSsePublisher() {
  if (!_ssePublisher) {
    _ssePublisher = createPublisher();
    _ssePublisher.connect().catch(() => {});
  }
  return _ssePublisher;
}

let _enrichmentWorker: Worker<EnrichmentJobData> | null = null;
export function getEnrichmentWorker(): Worker<EnrichmentJobData> {
  if (!_enrichmentWorker) {
    _enrichmentWorker = new Worker<EnrichmentJobData>(
      "enrichment",
      async (job: Job<EnrichmentJobData>) => {
        if (job.data.type === "enrich_column") {
          return processEnrichColumn(job as Job<EnrichColumnJobData>);
        }
        if (job.data.type === "enrich_cell") {
          return processEnrichCell(job as Job<EnrichCellJobData>);
        }
        throw new Error(`Unknown job type: ${(job.data as { type: string }).type}`);
      },
      {
        connection: getConnectionOptions(),
        concurrency: 10,
        limiter: { max: 50, duration: 1000 },
      },
    );
  }
  return _enrichmentWorker;
}

export const enrichmentWorker = new Proxy({} as Worker<EnrichmentJobData>, {
  get(_, prop) {
    return (getEnrichmentWorker() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Parent Job: Enrich Column ────────────────────────────────────────

async function processEnrichColumn(
  job: Job<EnrichColumnJobData>,
): Promise<void> {
  const { config, rows, apiKeys, jobId } = job.data;

  // Determine which rows to process based on mode
  let targetRows = rows;
  switch (config.mode) {
    case "first_10":
      targetRows = rows.slice(0, 10);
      break;
    case "selected":
      if (config.rowIds?.length) {
        const selectedSet = new Set(config.rowIds);
        targetRows = rows.filter((r) => selectedSet.has(r.rowId));
      }
      break;
    case "all":
      // Skip rows that already have a value (unless force_all)
      // The caller should pre-filter, but we include this for safety
      break;
    case "force_all":
      // Process all rows regardless
      break;
  }

  const totalRows = targetRows.length;
  let completedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let totalCredits = 0;

  // Add child jobs for each row
  const childJobPromises = targetRows.map((row) => {
    const cellJobData: EnrichCellJobData = {
      type: "enrich_cell",
      parentJobId: jobId,
      jobId: `${jobId}:${row.rowId}`,
      tableId: config.tableId,
      columnId: config.columnId,
      rowId: row.rowId,
      input: row.input,
      waterfallConfig: config.waterfallConfig,
      apiKeys,
    };

    return enrichmentQueue.add("enrich_cell", cellJobData, {
      jobId: `${jobId}:${row.rowId}`,
      parent: {
        id: job.id!,
        queue: enrichmentQueue.qualifiedName,
      },
    });
  });

  await Promise.all(childJobPromises);

  // Wait for all child jobs to complete by polling their status
  const childJobIds = targetRows.map((row) => `${jobId}:${row.rowId}`);

  // Poll until all children are done
  const POLL_INTERVAL_MS = 500;
  const MAX_WAIT_MS = 30 * 60 * 1000; // 30 minutes max
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    let allDone = true;

    for (const childId of childJobIds) {
      const childJob = await enrichmentQueue.getJob(childId);
      if (!childJob) continue;

      const state = await childJob.getState();
      if (state === "completed") {
        const returnValue = childJob.returnvalue as {
          creditsConsumed?: number;
          skipped?: boolean;
        } | null;
        if (returnValue?.skipped) {
          skippedCount++;
        } else {
          completedCount++;
          totalCredits += returnValue?.creditsConsumed ?? 0;
        }
      } else if (state === "failed") {
        failedCount++;
      } else {
        allDone = false;
      }
    }

    if (allDone) break;

    // Publish progress
    await publishEvent(
      getSsePublisher(),
      jobProgress(jobId, completedCount, totalRows, failedCount),
      config.tableId,
    );

    await job.updateProgress(
      Math.round(((completedCount + failedCount + skippedCount) / totalRows) * 100),
    );

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    // Reset counters for next poll (re-count from scratch)
    completedCount = 0;
    failedCount = 0;
    skippedCount = 0;
    totalCredits = 0;
  }

  // Final count
  completedCount = 0;
  failedCount = 0;
  skippedCount = 0;
  totalCredits = 0;

  for (const childId of childJobIds) {
    const childJob = await enrichmentQueue.getJob(childId);
    if (!childJob) {
      failedCount++;
      continue;
    }
    const state = await childJob.getState();
    if (state === "completed") {
      const returnValue = childJob.returnvalue as {
        creditsConsumed?: number;
        skipped?: boolean;
      } | null;
      if (returnValue?.skipped) {
        skippedCount++;
      } else {
        completedCount++;
        totalCredits += returnValue?.creditsConsumed ?? 0;
      }
    } else {
      failedCount++;
    }
  }

  // Publish final event
  await publishEvent(
    getSsePublisher(),
    jobCompleted(jobId, {
      completed: completedCount,
      failed: failedCount,
      skipped: skippedCount,
      creditsConsumed: totalCredits,
    }),
    config.tableId,
  );
}

// ── Child Job: Enrich Cell ───────────────────────────────────────────

async function processEnrichCell(
  job: Job<EnrichCellJobData>,
): Promise<{ creditsConsumed: number; skipped?: boolean }> {
  const { parentJobId, tableId, columnId, rowId, input, waterfallConfig, apiKeys } =
    job.data;

  // Publish "running" status
  await publishEvent(
    getSsePublisher(),
    cellStatusChanged(parentJobId, rowId, columnId, "running"),
    tableId,
  );

  try {
    const context: WaterfallContext = { apiKeys };
    const outcome = await runWaterfall(waterfallConfig, input, context);

    if (outcome.result?.success && outcome.result.data) {
      // Publish success
      await publishEvent(
        getSsePublisher(),
        cellStatusChanged(parentJobId, rowId, columnId, "complete", {
          data: outcome.result.data,
          source: outcome.result.source,
          confidence: outcome.result.confidence,
        }),
        tableId,
      );

      return { creditsConsumed: outcome.totalCreditsConsumed };
    }

    // No result from any provider
    await publishEvent(
      getSsePublisher(),
      cellStatusChanged(parentJobId, rowId, columnId, "error", {
        error: "No provider returned a result",
        attempts: outcome.attempts.length,
      }),
      tableId,
    );

    return { creditsConsumed: outcome.totalCreditsConsumed };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await publishEvent(
      getSsePublisher(),
      cellStatusChanged(parentJobId, rowId, columnId, "error", {
        error: errorMessage,
      }),
      tableId,
    );

    // Publish job-level failure event
    await publishEvent(
      getSsePublisher(),
      jobFailed(parentJobId, `Cell ${rowId} failed: ${errorMessage}`),
      tableId,
    );

    throw error; // Let BullMQ handle retries
  }
}

// ── Worker Event Handlers ────────────────────────────────────────────

enrichmentWorker.on("failed", async (job, err) => {
  if (!job) return;
  console.error(`[enrichment-worker] Job ${job.id} failed:`, err.message);

  if (job.data.type === "enrich_cell") {
    const data = job.data as EnrichCellJobData;
    await publishEvent(
      getSsePublisher(),
      cellStatusChanged(data.parentJobId, data.rowId, data.columnId, "error", {
        error: err.message,
      }),
      data.tableId,
    ).catch(() => {});
  }
});

enrichmentWorker.on("error", (err) => {
  console.error("[enrichment-worker] Worker error:", err.message);
});
