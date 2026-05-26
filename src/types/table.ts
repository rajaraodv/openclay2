// ── Enums ────────────────────────────────────────────────────────────

export enum CellStatus {
  Empty = "empty",
  Pending = "pending",
  Running = "running",
  Complete = "complete",
  Error = "error",
  Skipped = "skipped",
}

export enum ColumnDataType {
  Text = "text",
  Url = "url",
  Number = "number",
  Date = "date",
  Select = "select",
  MultiSelect = "multi_select",
  Checkbox = "checkbox",
  Currency = "currency",
  Email = "email",
  Image = "image",
  AssignedTo = "assigned_to",
}

export enum ColumnBehaviorType {
  Manual = "manual",
  Enrichment = "enrichment",
  Formula = "formula",
  AIAgent = "ai_agent",
  Action = "action",
}

// ── Column configuration types ───────────────────────────────────────

export interface EnrichmentProviderEntry {
  providerId: string;
  providerName: string;
  enabled: boolean;
}

export interface EnrichmentConfig {
  providerOrder: EnrichmentProviderEntry[];
  verificationProvider?: string;
  fieldType?: string;
}

export interface FormulaConfig {
  expression: string;
}

export interface AIAgentConfig {
  prompt: string;
  model: "gpt-4o" | "claude-sonnet" | "claude-opus" | "gemini-pro";
  contextColumns: string[];
}

export type ActionType = "http" | "webhook" | "slack" | "crm_push" | "write_table";

export interface ActionConfig {
  actionType: ActionType;
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  slackChannel?: string;
  slackMessage?: string;
  crmProvider?: string;
  crmObject?: string;
  targetTableId?: string;
  targetColumnMapping?: Record<string, string>;
}

export type ColumnConfig = EnrichmentConfig | FormulaConfig | AIAgentConfig | ActionConfig | Record<string, unknown>;

// ── Column definition ────────────────────────────────────────────────

export interface ColumnDef {
  id: string;
  name: string;
  dataType: ColumnDataType;
  columnType: ColumnBehaviorType;
  position: number;
  width: number;
  pinned: boolean;
  hidden: boolean;
  config: ColumnConfig;
  onlyRunIf?: string;
  autoRun?: boolean;
}

// ── Cell data ────────────────────────────────────────────────────────

export type CellValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | null
  | undefined;

export interface CellData {
  value: CellValue;
  rawValue?: CellValue;
  status: CellStatus;
  source?: string;
  confidence?: number;
  errorMessage?: string;
}

// ── Row data ─────────────────────────────────────────────────────────

export interface RowData {
  id: string;
  position: number;
  cells: Record<string, CellData>;
}

// ── Filter / Sort / View ─────────────────────────────────────────────

export type FilterOperator =
  | "contains"
  | "not_contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "is_empty"
  | "is_not_empty";

export interface FilterDef {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
}

export type FilterGroupLogic = "and" | "or";

export interface FilterGroup {
  logic: FilterGroupLogic;
  filters: FilterDef[];
}

export type SortDirection = "asc" | "desc";

export interface SortDef {
  id: string;
  columnId: string;
  direction: SortDirection;
}

export interface ViewDef {
  id: string;
  name: string;
  isDefault: boolean;
  filters: FilterGroup;
  sorts: SortDef[];
  hiddenColumns: string[];
}
