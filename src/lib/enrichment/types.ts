// ── Enrichment Engine Types ──────────────────────────────────────────

export type ProviderCategory =
  | "email"
  | "phone"
  | "company"
  | "people"
  | "technographic"
  | "verification"
  | "social";

export interface EnrichmentInput {
  email?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  linkedinUrl?: string;
  [key: string]: unknown;
}

export interface EnrichmentResult {
  success: boolean;
  data: Record<string, unknown> | null;
  source: string;
  confidence: number;
  creditsConsumed: number;
  rawResponse?: unknown;
}

export interface EnrichmentProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  fieldsProvided: string[];
  defaultCreditCost: number;
  rateLimitRPM: number;
  enrich(input: EnrichmentInput, apiKey: string): Promise<EnrichmentResult>;
  validateApiKey(apiKey: string): Promise<boolean>;
}

export interface WaterfallConfig {
  fieldType: string;
  providerOrder: string[];
  verificationProvider?: string;
}

export interface EnrichmentJobConfig {
  tableId: string;
  columnId: string;
  workspaceId: string;
  waterfallConfig: WaterfallConfig;
  onlyRunIf?: string;
  rowIds?: string[];
  mode: "first_10" | "all" | "selected" | "force_all";
}

// ── SSE Event Types ─────────────────────────────────────────────────

export type SSEEventType =
  | "cell_status_changed"
  | "job_progress"
  | "job_completed"
  | "job_failed";

export interface SSEEvent {
  type: SSEEventType;
  jobId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}
