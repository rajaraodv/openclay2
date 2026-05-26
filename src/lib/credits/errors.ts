// ── Credit System Errors ────────────────────────────────────────────

export class InsufficientCreditsError extends Error {
  public readonly workspaceId: string;
  public readonly creditType: "action" | "data";
  public readonly required: number;
  public readonly available: number;

  constructor(
    workspaceId: string,
    creditType: "action" | "data",
    required: number,
    available: number,
  ) {
    super(
      `Insufficient ${creditType} credits for workspace ${workspaceId}: ` +
        `required ${required}, available ${available}`,
    );
    this.name = "InsufficientCreditsError";
    this.workspaceId = workspaceId;
    this.creditType = creditType;
    this.required = required;
    this.available = available;
  }
}

export class ConcurrencyError extends Error {
  constructor(message?: string) {
    super(message ?? "Optimistic locking conflict — please retry the operation");
    this.name = "ConcurrencyError";
  }
}
