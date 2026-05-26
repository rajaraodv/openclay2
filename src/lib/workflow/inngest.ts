// ── Inngest Durable Workflow Functions ──────────────────────────────
// Inngest provides durable execution with automatic retries, step
// functions, and scheduling. Each step is individually retriable.

import { Inngest } from "inngest";
import { executeColumn } from "./executor";
import type { ExecutionMode } from "./types";
import { buildExecutionDAG } from "./dag";
import type { ColumnDef } from "./types";

// ── Inngest Client ──────────────────────────────────────────────────

export const inngest = new Inngest({
  id: "openclay",
});

// ── Event Types ─────────────────────────────────────────────────────

type ColumnRunEvent = {
  name: "openclay/column.run";
  data: {
    tableId: string;
    columnId: string;
    workspaceId: string;
    mode: ExecutionMode;
    selectedRowIds?: string[];
    userId: string;
  };
};

type TableScheduledRunEvent = {
  name: "openclay/table.scheduled-run";
  data: {
    tableId: string;
    workspaceId: string;
    /** Column definitions with behaviors and dependencies */
    columns: ColumnDef[];
    mode: ExecutionMode;
    userId: string;
  };
};

// ── Column Run Function ─────────────────────────────────────────────

/**
 * Triggered when a user clicks "Run" on a column.
 * Executes the column workflow with step-based retry for durability.
 */
export const columnRunFunction = inngest.createFunction(
  {
    id: "openclay-column-run",
    name: "OpenClay Column Run",
    retries: 3,
    triggers: [{ event: "openclay/column.run" }],
    concurrency: [
      {
        // Limit concurrent runs per workspace to avoid overloading
        limit: 5,
        key: "event.data.workspaceId",
      },
    ],
    cancelOn: [
      {
        event: "openclay/column.run.cancel",
        match: "data.columnId",
      },
    ],
  },
  async ({ event, step }: { event: ColumnRunEvent; step: any }) => {
    const { tableId, columnId, workspaceId, mode, selectedRowIds } =
      event.data;

    // Step 1: Execute the column
    const result = await step.run("execute-column", async () => {
      return await executeColumn(
        tableId,
        columnId,
        mode,
        workspaceId,
        selectedRowIds,
      );
    });

    // Step 2: Record execution metrics
    await step.run("record-metrics", async () => {
      // In production, this would write to an analytics/metrics table.
      // For now, we log the execution result.
      return {
        columnId,
        tableId,
        workspaceId,
        totalRows: result.totalRows,
        completedRows: result.completedRows,
        failedRows: result.failedRows,
        skippedRows: result.skippedRows,
        creditsConsumed: result.creditsConsumed,
        completedAt: new Date().toISOString(),
      };
    });

    // Step 3: If there were failures, optionally retry just the failed rows
    if (result.failedRows > 0 && mode !== "force_all") {
      const failedRowIds: string[] = [];
      for (const [rowId, cellResult] of result.results) {
        if (!cellResult.success) {
          failedRowIds.push(rowId);
        }
      }

      if (failedRowIds.length > 0 && failedRowIds.length <= 10) {
        await step.run("retry-failed-rows", async () => {
          return await executeColumn(
            tableId,
            columnId,
            "selected",
            workspaceId,
            failedRowIds,
          );
        });
      }
    }

    return {
      status: "completed",
      totalRows: result.totalRows,
      completedRows: result.completedRows,
      failedRows: result.failedRows,
      skippedRows: result.skippedRows,
      creditsConsumed: result.creditsConsumed,
    };
  },
);

// ── Table Scheduled Run Function ────────────────────────────────────

/**
 * Scheduled execution of all columns in a table.
 * Respects the dependency DAG — runs columns in topological order,
 * executing independent columns in parallel within each tier.
 */
export const tableScheduledRunFunction = inngest.createFunction(
  {
    id: "openclay-table-scheduled-run",
    name: "OpenClay Table Scheduled Run",
    retries: 2,
    triggers: [{ event: "openclay/table.scheduled-run" }],
    concurrency: [
      {
        limit: 2,
        key: "event.data.workspaceId",
      },
    ],
  },
  async ({ event, step }: { event: TableScheduledRunEvent; step: any }) => {
    const { tableId, workspaceId, columns, mode } = event.data;

    // Step 1: Build the execution DAG
    const plan = await step.run("build-execution-plan", async () => {
      const dag = buildExecutionDAG(columns);
      return {
        totalTiers: dag.totalTiers,
        // Convert Map to serializable format for Inngest step state
        tiers: Array.from(dag.tiers.entries()).map(([tier, steps]) => ({
          tier,
          steps: steps.map((s: { columnId: string; columnName: string; tableId: string }) => ({
            columnId: s.columnId,
            columnName: s.columnName,
            tableId: s.tableId,
          })),
        })),
      };
    });

    // Step 2: Execute each tier sequentially (columns within a tier in parallel)
    const tierResults: Record<string, any> = {};

    for (const tierInfo of plan.tiers) {
      const tierResult = await step.run(
        `execute-tier-${tierInfo.tier}`,
        async () => {
          // Execute all columns in this tier
          // Within a tier, columns are independent and can run in parallel
          const results = await Promise.allSettled(
            tierInfo.steps.map((col: { tableId: string; columnId: string; columnName: string }) =>
              executeColumn(
                col.tableId,
                col.columnId,
                mode,
                workspaceId,
              ),
            ),
          );

          return results.map((r, i) => ({
            columnId: tierInfo.steps[i].columnId,
            columnName: tierInfo.steps[i].columnName,
            status: r.status,
            result:
              r.status === "fulfilled"
                ? {
                    completedRows: r.value.completedRows,
                    failedRows: r.value.failedRows,
                    skippedRows: r.value.skippedRows,
                    creditsConsumed: r.value.creditsConsumed,
                  }
                : { error: r.status === "rejected" ? String(r.reason) : "Unknown error" },
          }));
        },
      );

      tierResults[`tier_${tierInfo.tier}`] = tierResult;
    }

    return {
      status: "completed",
      tableId,
      tierResults,
    };
  },
);

// ── Export all functions for the Inngest serve handler ───────────────

export const inngestFunctions = [columnRunFunction, tableScheduledRunFunction];
