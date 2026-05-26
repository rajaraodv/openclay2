import Redis from "ioredis";
import type { SSEEvent, SSEEventType } from "./types";

// ── Channel Naming ───────────────────────────────────────────────────

function getJobChannel(jobId: string): string {
  return `enrichment:job:${jobId}`;
}

function getTableChannel(tableId: string): string {
  return `enrichment:table:${tableId}`;
}

// ── Publishing ───────────────────────────────────────────────────────

/**
 * Create a dedicated Redis publisher connection.
 * Caller is responsible for calling .disconnect() when done.
 */
export function createPublisher(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Redis(url, { maxRetriesPerRequest: null, lazyConnect: true });
}

/**
 * Publish an enrichment progress event to both the job and table channels.
 */
export async function publishEvent(
  publisher: Redis,
  event: SSEEvent,
  tableId?: string,
): Promise<void> {
  const payload = JSON.stringify(event);
  const jobChannel = getJobChannel(event.jobId);

  const promises: Promise<number>[] = [publisher.publish(jobChannel, payload)];

  if (tableId) {
    promises.push(publisher.publish(getTableChannel(tableId), payload));
  }

  await Promise.all(promises);
}

// ── Convenience Event Builders ───────────────────────────────────────

export function cellStatusChanged(
  jobId: string,
  rowId: string,
  columnId: string,
  status: string,
  data?: Record<string, unknown>,
): SSEEvent {
  return {
    type: "cell_status_changed",
    jobId,
    payload: { rowId, columnId, status, ...data },
    timestamp: Date.now(),
  };
}

export function jobProgress(
  jobId: string,
  completed: number,
  total: number,
  failed: number,
): SSEEvent {
  return {
    type: "job_progress",
    jobId,
    payload: { completed, total, failed, percent: Math.round((completed / total) * 100) },
    timestamp: Date.now(),
  };
}

export function jobCompleted(
  jobId: string,
  stats: { completed: number; failed: number; skipped: number; creditsConsumed: number },
): SSEEvent {
  return {
    type: "job_completed",
    jobId,
    payload: stats,
    timestamp: Date.now(),
  };
}

export function jobFailed(jobId: string, error: string): SSEEvent {
  return {
    type: "job_failed",
    jobId,
    payload: { error },
    timestamp: Date.now(),
  };
}

// ── SSE ReadableStream ───────────────────────────────────────────────

/**
 * Create a ReadableStream that subscribes to a job's Redis pub/sub channel
 * and emits Server-Sent Events. Suitable for use in a Next.js route handler
 * that returns a streaming Response.
 *
 * Usage in a route handler:
 *   return new Response(createSSEStream(jobId), {
 *     headers: {
 *       'Content-Type': 'text/event-stream',
 *       'Cache-Control': 'no-cache',
 *       Connection: 'keep-alive',
 *     },
 *   });
 */
export function createSSEStream(
  jobId: string,
  options?: { tableId?: string },
): ReadableStream<Uint8Array> {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const subscriber = new Redis(url, { maxRetriesPerRequest: null });

  const encoder = new TextEncoder();
  const channels: string[] = [getJobChannel(jobId)];
  if (options?.tableId) {
    channels.push(getTableChannel(options.tableId));
  }

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Subscribe to channels
      await subscriber.subscribe(...channels);

      subscriber.on("message", (_channel: string, message: string) => {
        try {
          const event = JSON.parse(message) as SSEEvent;
          const ssePayload = formatSSE(event.type, message);
          controller.enqueue(encoder.encode(ssePayload));

          // Auto-close stream on terminal events
          if (
            event.type === "job_completed" ||
            event.type === "job_failed"
          ) {
            cleanup(controller);
          }
        } catch {
          // Ignore malformed messages
        }
      });

      // Send heartbeat every 15 seconds to keep the connection alive
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Stream may have been closed
          cleanup(controller);
        }
      }, 15_000);

      // Send initial connected event
      const connectedEvent: SSEEvent = {
        type: "job_progress" as SSEEventType,
        jobId,
        payload: { connected: true },
        timestamp: Date.now(),
      };
      controller.enqueue(
        encoder.encode(formatSSE("connected", JSON.stringify(connectedEvent))),
      );
    },

    cancel() {
      cleanup();
    },
  });

  function cleanup(controller?: ReadableStreamDefaultController<Uint8Array>) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    subscriber.unsubscribe().catch(() => {});
    subscriber.disconnect();
    try {
      controller?.close();
    } catch {
      // already closed
    }
  }
}

function formatSSE(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}
