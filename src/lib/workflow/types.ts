// ── Column Workflow Types ───────────────────────────────────────────

// ── Behavior Types ──────────────────────────────────────────────────

export interface ManualBehavior {
  type: "manual";
}

export interface EnrichmentBehavior {
  type: "enrichment";
  providerId: string;
  waterfallProviders?: string[];
  fieldMapping: Record<string, string>;
  onlyRunIf?: string;
}

export interface FormulaBehavior {
  type: "formula";
  expression: string;
  outputType: string;
}

export interface AIAgentBehavior {
  type: "ai_agent";
  prompt: string;
  model: string;
  contextColumns: string[];
  outputSchema?: Record<string, any>;
  tools?: string[];
}

export interface ActionBehavior {
  type: "action";
  actionType:
    | "http"
    | "webhook"
    | "slack"
    | "crm_push"
    | "write_table"
    | "email_sequence";
  config: Record<string, any>;
}

export type ColumnBehavior =
  | ManualBehavior
  | EnrichmentBehavior
  | FormulaBehavior
  | AIAgentBehavior
  | ActionBehavior;

// ── Dependency & Execution Types ────────────────────────────────────

export interface ColumnDependency {
  columnId: string;
  tableId?: string;
}

export interface ColumnDef {
  id: string;
  name: string;
  tableId: string;
  behavior: ColumnBehavior;
  dependencies: ColumnDependency[];
  position: number;
}

export interface ExecutionStep {
  columnId: string;
  columnName: string;
  tableId: string;
  behavior: ColumnBehavior;
  dependencies: ColumnDependency[];
  /** Columns in this tier can execute in parallel */
  tier: number;
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  /** Maximum parallelism tier — total number of sequential phases */
  totalTiers: number;
  /** Columns grouped by tier for parallel execution */
  tiers: Map<number, ExecutionStep[]>;
}

// ── Workflow Events ─────────────────────────────────────────────────

export type WorkflowEventType =
  | "column_execution_started"
  | "column_execution_completed"
  | "column_execution_failed"
  | "cell_updated"
  | "cell_skipped"
  | "cell_error"
  | "row_completed"
  | "credits_deducted";

export interface WorkflowEvent {
  type: WorkflowEventType;
  tableId: string;
  rowId: string;
  columnId: string;
  status: "pending" | "running" | "complete" | "error" | "skipped";
  data?: Record<string, any>;
  error?: string;
  timestamp: number;
}

// ── Execution Modes ─────────────────────────────────────────────────

export type ExecutionMode = "first_10" | "all" | "selected" | "force_all";

// ── Result Types ────────────────────────────────────────────────────

export interface CellResult {
  success: boolean;
  value?: any;
  rawValue?: any;
  source?: string;
  confidence?: number;
  error?: string;
  creditsConsumed?: number;
}

export interface ColumnExecutionResult {
  columnId: string;
  tableId: string;
  totalRows: number;
  completedRows: number;
  failedRows: number;
  skippedRows: number;
  creditsConsumed: number;
  results: Map<string, CellResult>;
}
