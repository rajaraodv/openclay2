// ── Column Workflow Executor ────────────────────────────────────────
// The main entry point for running column workflows. Dispatches to the
// appropriate handler based on column type and manages cell lifecycle.

import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { columns, cells, rows } from "@/db/schema/tables";
import { creditWallets } from "@/db/schema/credits";
import type {
  ColumnBehavior,
  EnrichmentBehavior,
  FormulaBehavior,
  AIAgentBehavior,
  ActionBehavior,
  ExecutionMode,
  CellResult,
  ColumnExecutionResult,
  WorkflowEvent,
} from "./types";
import { evaluateFormula, evaluateCondition } from "@/lib/formula/engine";
import { runAgent } from "@/lib/ai-agent/agent";
import {
  executeHttpAction,
  executeWebhookAction,
  executeSlackAction,
  executeWriteTableAction,
  type HttpActionConfig,
  type WebhookActionConfig,
  type SlackActionConfig,
  type WriteTableActionConfig,
} from "./actions";

// ── SSE Event Emitter (lightweight pub/sub) ─────────────────────────

type EventListener = (event: WorkflowEvent) => void;
const listeners = new Set<EventListener>();

export function subscribeToWorkflowEvents(listener: EventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitEvent(event: WorkflowEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Swallow listener errors to avoid breaking the execution loop
    }
  }
}

// ── Credit Check ────────────────────────────────────────────────────

async function checkCreditBalance(
  workspaceId: string,
  requiredCredits: number,
): Promise<{ sufficient: boolean; balance: number }> {
  const wallets = await db
    .select()
    .from(creditWallets)
    .where(
      and(
        eq(creditWallets.workspaceId, workspaceId),
        eq(creditWallets.creditType, "action"),
      ),
    );

  const wallet = wallets[0];
  const balance = wallet?.balance ?? 0;

  return {
    sufficient: balance >= requiredCredits,
    balance,
  };
}

// ── Row Context Builder ─────────────────────────────────────────────

/**
 * Build a context object for a row by fetching all cell values
 * and mapping them to column names.
 */
async function buildRowContext(
  tableId: string,
  rowId: string,
): Promise<Record<string, any>> {
  const tableColumns = await db
    .select()
    .from(columns)
    .where(eq(columns.tableId, tableId));

  const rowCells = await db
    .select()
    .from(cells)
    .where(eq(cells.rowId, rowId));

  const context: Record<string, any> = {};
  for (const col of tableColumns) {
    const cell = rowCells.find((c) => c.columnId === col.id);
    context[col.name] = cell?.value ?? null;
  }

  return context;
}

// ── Get Target Row IDs ──────────────────────────────────────────────

async function getTargetRowIds(
  tableId: string,
  columnId: string,
  mode: ExecutionMode,
  selectedRowIds?: string[],
): Promise<string[]> {
  switch (mode) {
    case "selected": {
      if (!selectedRowIds || selectedRowIds.length === 0) {
        throw new Error("No rows selected for execution");
      }
      return selectedRowIds;
    }

    case "first_10": {
      const result = await db
        .select({ id: rows.id })
        .from(rows)
        .where(eq(rows.tableId, tableId))
        .orderBy(rows.position)
        .limit(10);
      return result.map((r) => r.id);
    }

    case "all": {
      // Only run on rows that haven't been completed yet
      const allRows = await db
        .select({ id: rows.id })
        .from(rows)
        .where(eq(rows.tableId, tableId))
        .orderBy(rows.position);

      const completedCells = await db
        .select({ rowId: cells.rowId })
        .from(cells)
        .where(
          and(
            eq(cells.columnId, columnId),
            eq(cells.status, "complete"),
          ),
        );

      const completedRowIds = new Set(completedCells.map((c) => c.rowId));
      return allRows.filter((r) => !completedRowIds.has(r.id)).map((r) => r.id);
    }

    case "force_all": {
      const result = await db
        .select({ id: rows.id })
        .from(rows)
        .where(eq(rows.tableId, tableId))
        .orderBy(rows.position);
      return result.map((r) => r.id);
    }

    default:
      throw new Error(`Unknown execution mode: ${mode}`);
  }
}

// ── Cell Status Updates ─────────────────────────────────────────────

async function updateCellStatus(
  rowId: string,
  columnId: string,
  status: "pending" | "running" | "complete" | "error" | "skipped",
  data?: {
    value?: any;
    rawValue?: any;
    source?: string;
    confidence?: number;
    errorMessage?: string;
  },
): Promise<void> {
  const existing = await db
    .select()
    .from(cells)
    .where(and(eq(cells.rowId, rowId), eq(cells.columnId, columnId)));

  if (existing.length > 0) {
    await db
      .update(cells)
      .set({
        status,
        value: data?.value !== undefined ? data.value : undefined,
        rawValue: data?.rawValue !== undefined ? data.rawValue : undefined,
        source: data?.source,
        confidence: data?.confidence,
        errorMessage: data?.errorMessage,
        enrichedAt: status === "complete" ? new Date() : undefined,
      })
      .where(and(eq(cells.rowId, rowId), eq(cells.columnId, columnId)));
  } else {
    await db.insert(cells).values({
      rowId,
      columnId,
      status,
      value: data?.value ?? null,
      rawValue: data?.rawValue ?? null,
      source: data?.source ?? null,
      confidence: data?.confidence ?? null,
      errorMessage: data?.errorMessage ?? null,
      enrichedAt: status === "complete" ? new Date() : null,
    });
  }
}

// ── Behavior Handlers ───────────────────────────────────────────────

async function executeEnrichment(
  behavior: EnrichmentBehavior,
  tableId: string,
  rowId: string,
  context: Record<string, any>,
): Promise<CellResult> {
  // The enrichment engine handles provider calls and waterfall logic.
  // This is the integration point — the enrichment system is defined
  // separately and invoked here.

  // Build input from field mapping
  const input: Record<string, any> = {};
  for (const [targetField, sourceExpr] of Object.entries(behavior.fieldMapping)) {
    // sourceExpr can be a column name or a {{ColumnName}} template
    if (sourceExpr.includes("{{")) {
      input[targetField] = sourceExpr.replace(
        /\{\{([^}]+)\}\}/g,
        (_m, ref: string) => context[ref.trim()] ?? "",
      );
    } else {
      input[targetField] = context[sourceExpr] ?? null;
    }
  }

  // Build provider waterfall: primary provider + fallbacks
  const providers = [behavior.providerId, ...(behavior.waterfallProviders ?? [])];

  let lastError: string | undefined;

  for (const providerId of providers) {
    try {
      // Placeholder: In production, this calls the enrichment provider registry
      // which maps providerId to actual API calls (Clearbit, Hunter, Apollo, etc.)
      // For now, we return a structured result indicating the provider was called.
      const result = await callEnrichmentProvider(providerId, input);

      if (result.success) {
        return {
          success: true,
          value: result.data,
          rawValue: result.rawResponse,
          source: providerId,
          confidence: result.confidence,
          creditsConsumed: result.creditsConsumed,
        };
      }

      lastError = result.error;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    success: false,
    error: lastError ?? "All providers in waterfall failed",
    creditsConsumed: 0,
  };
}

/**
 * Placeholder for the enrichment provider call.
 * In production, this would be replaced by the actual provider registry.
 */
async function callEnrichmentProvider(
  providerId: string,
  input: Record<string, any>,
): Promise<{
  success: boolean;
  data?: Record<string, any>;
  rawResponse?: any;
  confidence: number;
  creditsConsumed: number;
  error?: string;
}> {
  // This will be implemented by the enrichment module.
  // Returning a typed placeholder so the executor compiles correctly.
  return {
    success: false,
    confidence: 0,
    creditsConsumed: 0,
    error: `Enrichment provider "${providerId}" not yet configured. Input: ${JSON.stringify(input)}`,
  };
}

async function executeFormulaColumn(
  behavior: FormulaBehavior,
  _tableId: string,
  _rowId: string,
  context: Record<string, any>,
): Promise<CellResult> {
  const result = evaluateFormula(behavior.expression, context);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    value: result.result,
    source: "formula",
    confidence: 1.0,
    creditsConsumed: 0,
  };
}

async function executeAIAgent(
  behavior: AIAgentBehavior,
  _tableId: string,
  _rowId: string,
  context: Record<string, any>,
): Promise<CellResult> {
  const result = await runAgent(behavior, context);

  return {
    success: result.success,
    value: result.output,
    rawValue: { reasoning: result.reasoning, sources: result.sources },
    source: `ai_agent:${behavior.model}`,
    confidence: result.confidence,
    error: result.error,
    creditsConsumed: result.tokensUsed ? Math.ceil(result.tokensUsed / 1000) : 1,
  };
}

async function executeAction(
  behavior: ActionBehavior,
  _tableId: string,
  _rowId: string,
  context: Record<string, any>,
): Promise<CellResult> {
  switch (behavior.actionType) {
    case "http":
      return executeHttpAction(behavior.config as HttpActionConfig, context);

    case "webhook":
      return executeWebhookAction(behavior.config as WebhookActionConfig, context);

    case "slack":
      return executeSlackAction(behavior.config as SlackActionConfig, context);

    case "write_table":
      return executeWriteTableAction(behavior.config as WriteTableActionConfig, context);

    case "crm_push":
      // CRM push would integrate with Salesforce, HubSpot, etc.
      return {
        success: false,
        error: "CRM push action not yet implemented",
      };

    case "email_sequence":
      // Email sequence would integrate with an email service
      return {
        success: false,
        error: "Email sequence action not yet implemented",
      };

    default:
      return {
        success: false,
        error: `Unknown action type: ${behavior.actionType}`,
      };
  }
}

// ── Main Executor ───────────────────────────────────────────────────

/**
 * Execute a column workflow for the given rows.
 *
 * @param tableId     The table containing the column
 * @param columnId    The column to execute
 * @param mode        Execution mode: 'first_10', 'all', 'selected', 'force_all'
 * @param workspaceId Workspace for credit checks
 * @param selectedRowIds Optional list of specific row IDs (for 'selected' mode)
 */
export async function executeColumn(
  tableId: string,
  columnId: string,
  mode: ExecutionMode,
  workspaceId: string,
  selectedRowIds?: string[],
): Promise<ColumnExecutionResult> {
  // Fetch the column definition
  const [column] = await db
    .select()
    .from(columns)
    .where(eq(columns.id, columnId));

  if (!column) {
    throw new Error(`Column ${columnId} not found`);
  }

  const behavior = column.config as ColumnBehavior;

  if (behavior.type === "manual") {
    throw new Error("Manual columns cannot be executed");
  }

  // Get the target rows
  const rowIds = await getTargetRowIds(tableId, columnId, mode, selectedRowIds);

  if (rowIds.length === 0) {
    return {
      columnId,
      tableId,
      totalRows: 0,
      completedRows: 0,
      failedRows: 0,
      skippedRows: 0,
      creditsConsumed: 0,
      results: new Map(),
    };
  }

  // Check credit balance (estimate 1 credit per row)
  const creditCheck = await checkCreditBalance(workspaceId, rowIds.length);
  if (!creditCheck.sufficient) {
    throw new Error(
      `Insufficient credits. Required: ~${rowIds.length}, Available: ${creditCheck.balance}`,
    );
  }

  // Emit start event
  emitEvent({
    type: "column_execution_started",
    tableId,
    rowId: "",
    columnId,
    status: "running",
    data: { totalRows: rowIds.length, mode },
    timestamp: Date.now(),
  });

  const executionResult: ColumnExecutionResult = {
    columnId,
    tableId,
    totalRows: rowIds.length,
    completedRows: 0,
    failedRows: 0,
    skippedRows: 0,
    creditsConsumed: 0,
    results: new Map(),
  };

  // Mark all target cells as pending
  for (const rowId of rowIds) {
    await updateCellStatus(rowId, columnId, "pending");
  }

  // Execute each row
  for (const rowId of rowIds) {
    try {
      // Build the row context (all cell values for this row)
      const context = await buildRowContext(tableId, rowId);

      // Check "only_run_if" condition
      const onlyRunIf = getOnlyRunIf(behavior);
      if (onlyRunIf) {
        const shouldRun = evaluateCondition(onlyRunIf, context);
        if (!shouldRun) {
          await updateCellStatus(rowId, columnId, "skipped");
          executionResult.skippedRows++;
          executionResult.results.set(rowId, {
            success: true,
            value: null,
            source: "skipped",
          });

          emitEvent({
            type: "cell_skipped",
            tableId,
            rowId,
            columnId,
            status: "skipped",
            timestamp: Date.now(),
          });

          continue;
        }
      }

      // Mark cell as running
      await updateCellStatus(rowId, columnId, "running");

      emitEvent({
        type: "cell_updated",
        tableId,
        rowId,
        columnId,
        status: "running",
        timestamp: Date.now(),
      });

      // Dispatch to the appropriate handler
      let cellResult: CellResult;

      switch (behavior.type) {
        case "enrichment":
          cellResult = await executeEnrichment(behavior, tableId, rowId, context);
          break;
        case "formula":
          cellResult = await executeFormulaColumn(behavior, tableId, rowId, context);
          break;
        case "ai_agent":
          cellResult = await executeAIAgent(behavior, tableId, rowId, context);
          break;
        case "action":
          cellResult = await executeAction(behavior, tableId, rowId, context);
          break;
        default:
          cellResult = { success: false, error: `Unknown behavior type` };
      }

      // Update cell status based on result
      if (cellResult.success) {
        await updateCellStatus(rowId, columnId, "complete", {
          value: cellResult.value,
          rawValue: cellResult.rawValue,
          source: cellResult.source,
          confidence: cellResult.confidence,
        });
        executionResult.completedRows++;
      } else {
        await updateCellStatus(rowId, columnId, "error", {
          errorMessage: cellResult.error,
        });
        executionResult.failedRows++;
      }

      executionResult.creditsConsumed += cellResult.creditsConsumed ?? 0;
      executionResult.results.set(rowId, cellResult);

      // Emit cell event
      emitEvent({
        type: cellResult.success ? "cell_updated" : "cell_error",
        tableId,
        rowId,
        columnId,
        status: cellResult.success ? "complete" : "error",
        data: cellResult.success ? { value: cellResult.value } : undefined,
        error: cellResult.error,
        timestamp: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateCellStatus(rowId, columnId, "error", {
        errorMessage: message,
      });
      executionResult.failedRows++;
      executionResult.results.set(rowId, { success: false, error: message });

      emitEvent({
        type: "cell_error",
        tableId,
        rowId,
        columnId,
        status: "error",
        error: message,
        timestamp: Date.now(),
      });
    }
  }

  // Emit completion event
  emitEvent({
    type: "column_execution_completed",
    tableId,
    rowId: "",
    columnId,
    status: "complete",
    data: {
      completedRows: executionResult.completedRows,
      failedRows: executionResult.failedRows,
      skippedRows: executionResult.skippedRows,
      creditsConsumed: executionResult.creditsConsumed,
    },
    timestamp: Date.now(),
  });

  return executionResult;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getOnlyRunIf(behavior: ColumnBehavior): string | undefined {
  if (behavior.type === "enrichment") {
    return behavior.onlyRunIf;
  }
  // Other behavior types could support onlyRunIf via their config
  return undefined;
}
