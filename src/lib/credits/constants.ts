// ── Plan Credit Allocations ─────────────────────────────────────────

export const PLAN_CREDITS: Record<
  "free" | "launch" | "growth" | "enterprise",
  { actions: number; dataCredits: number }
> = {
  free: { actions: 500, dataCredits: 100 },
  launch: { actions: 15_000, dataCredits: 2_500 },
  growth: { actions: 50_000, dataCredits: 10_000 },
  enterprise: { actions: 200_000, dataCredits: 50_000 },
};

// ── Provider Credit Costs (Wave 1) ────────────────────────────────

export const PROVIDER_COSTS: Record<
  string,
  { dataCreditCost: number; actionCost: number }
> = {
  apollo: { dataCreditCost: 1, actionCost: 1 },
  hunter: { dataCreditCost: 1, actionCost: 1 },
  clearbit: { dataCreditCost: 1, actionCost: 1 },
  zerobounce: { dataCreditCost: 1, actionCost: 1 },
  prospeo: { dataCreditCost: 1, actionCost: 1 },
  "people-data-labs": { dataCreditCost: 1, actionCost: 1 },
  lusha: { dataCreditCost: 1, actionCost: 1 },
  dropcontact: { dataCreditCost: 1, actionCost: 1 },
  crunchbase: { dataCreditCost: 1, actionCost: 1 },
  builtwith: { dataCreditCost: 2, actionCost: 1 },
};

// ── BYOK Discount ──────────────────────────────────────────────────
// When a workspace supplies its own API key for a provider,
// the data-credit cost drops to 0 (only the action credit is charged).

export const BYOK_DISCOUNT = {
  dataCreditCost: 0,
  actionCost: 1,
} as const;
