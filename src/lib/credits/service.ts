import { eq, and, sql, between, desc, SQL } from "drizzle-orm";
import { db } from "@/db";
import { creditWallets, creditLedger } from "@/db/schema/credits";
import { workspaces } from "@/db/schema/workspaces";
import { InsufficientCreditsError, ConcurrencyError } from "./errors";
import { PLAN_CREDITS } from "./constants";

// ── Types ───────────────────────────────────────────────────────────

type CreditType = "action" | "data";

interface UsageOptions {
  from?: Date;
  to?: Date;
  creditType?: CreditType;
  groupBy?: "day" | "month";
}

interface UsageRow {
  date: string;
  actionCredits: number;
  dataCredits: number;
  byProvider: Record<string, number>;
}

interface TransactionHistoryOptions {
  limit: number;
  offset: number;
  creditType?: CreditType;
}

interface LedgerEntry {
  id: string;
  creditType: string;
  operation: string;
  amount: number;
  balanceAfter: number;
  source: string | null;
  referenceId: string | null;
  createdAt: Date;
}

// ── Service ─────────────────────────────────────────────────────────

/**
 * Get the current credit balance for a workspace + credit type.
 */
export async function getBalance(
  workspaceId: string,
  creditType: CreditType,
): Promise<number> {
  const [wallet] = await db
    .select({ balance: creditWallets.balance })
    .from(creditWallets)
    .where(
      and(
        eq(creditWallets.workspaceId, workspaceId),
        eq(creditWallets.creditType, creditType),
      ),
    )
    .limit(1);

  return wallet?.balance ?? 0;
}

/**
 * Deduct credits using optimistic locking inside a transaction.
 *
 * 1. SELECT ... FOR UPDATE the wallet row
 * 2. Verify balance >= amount
 * 3. UPDATE balance, increment version
 * 4. INSERT ledger record with idempotency key
 *
 * Throws `InsufficientCreditsError` if balance is too low.
 * Throws `ConcurrencyError` if the optimistic-lock update affects 0 rows.
 * Returns the new balance.
 */
export async function deductCredits(
  workspaceId: string,
  creditType: CreditType,
  amount: number,
  source: string,
  referenceId?: string,
): Promise<number> {
  if (amount <= 0) {
    throw new Error("Deduction amount must be positive");
  }

  const idempotencyKey = referenceId
    ? `burn:${workspaceId}:${creditType}:${referenceId}`
    : undefined;

  // If an idempotency key is provided, check for an existing ledger entry first
  if (idempotencyKey) {
    const [existing] = await db
      .select({ balanceAfter: creditLedger.balanceAfter })
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing) {
      return existing.balanceAfter;
    }
  }

  return await db.transaction(async (tx) => {
    // 1. Lock the wallet row
    const lockedRows = await tx.execute<{
      balance: number;
      version: number;
    }>(
      sql`SELECT balance, version
          FROM credit_wallets
          WHERE workspace_id = ${workspaceId}
            AND credit_type = ${creditType}
          FOR UPDATE`,
    );

    const wallet = lockedRows[0];

    if (!wallet) {
      throw new Error(
        `No ${creditType} wallet found for workspace ${workspaceId}`,
      );
    }

    // 2. Check balance
    if (wallet.balance < amount) {
      throw new InsufficientCreditsError(
        workspaceId,
        creditType,
        amount,
        wallet.balance,
      );
    }

    const newBalance = wallet.balance - amount;
    const expectedVersion = wallet.version;

    // 3. Optimistic-lock update
    const updateResult = await tx.execute(
      sql`UPDATE credit_wallets
          SET balance = ${newBalance},
              version = version + 1
          WHERE workspace_id = ${workspaceId}
            AND credit_type = ${creditType}
            AND version = ${expectedVersion}`,
    );

    if ((updateResult.count ?? 0) === 0) {
      throw new ConcurrencyError();
    }

    // 4. Insert ledger record
    await tx.insert(creditLedger).values({
      workspaceId,
      creditType,
      operation: "burn",
      amount: -amount,
      balanceAfter: newBalance,
      source,
      referenceId: referenceId ?? null,
      idempotencyKey: idempotencyKey ?? null,
    });

    return newBalance;
  });
}

/**
 * Grant credits to a workspace (subscription renewal, top-up, etc.).
 */
export async function grantCredits(
  workspaceId: string,
  creditType: CreditType,
  amount: number,
  source: string,
): Promise<number> {
  if (amount <= 0) {
    throw new Error("Grant amount must be positive");
  }

  return await db.transaction(async (tx) => {
    const lockedRows = await tx.execute<{
      balance: number;
      version: number;
    }>(
      sql`SELECT balance, version
          FROM credit_wallets
          WHERE workspace_id = ${workspaceId}
            AND credit_type = ${creditType}
          FOR UPDATE`,
    );

    const wallet = lockedRows[0];

    if (!wallet) {
      throw new Error(
        `No ${creditType} wallet found for workspace ${workspaceId}`,
      );
    }

    const newBalance = wallet.balance + amount;

    const updateResult = await tx.execute(
      sql`UPDATE credit_wallets
          SET balance = ${newBalance},
              version = version + 1
          WHERE workspace_id = ${workspaceId}
            AND credit_type = ${creditType}
            AND version = ${wallet.version}`,
    );

    if ((updateResult.count ?? 0) === 0) {
      throw new ConcurrencyError();
    }

    await tx.insert(creditLedger).values({
      workspaceId,
      creditType,
      operation: "grant",
      amount,
      balanceAfter: newBalance,
      source,
    });

    return newBalance;
  });
}

/**
 * Refund credits for a failed enrichment or other reversal.
 */
export async function refundCredits(
  workspaceId: string,
  creditType: CreditType,
  amount: number,
  source: string,
  referenceId?: string,
): Promise<number> {
  if (amount <= 0) {
    throw new Error("Refund amount must be positive");
  }

  const idempotencyKey = referenceId
    ? `refund:${workspaceId}:${creditType}:${referenceId}`
    : undefined;

  if (idempotencyKey) {
    const [existing] = await db
      .select({ balanceAfter: creditLedger.balanceAfter })
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing) {
      return existing.balanceAfter;
    }
  }

  return await db.transaction(async (tx) => {
    const lockedRows = await tx.execute<{
      balance: number;
      version: number;
    }>(
      sql`SELECT balance, version
          FROM credit_wallets
          WHERE workspace_id = ${workspaceId}
            AND credit_type = ${creditType}
          FOR UPDATE`,
    );

    const wallet = lockedRows[0];

    if (!wallet) {
      throw new Error(
        `No ${creditType} wallet found for workspace ${workspaceId}`,
      );
    }

    const newBalance = wallet.balance + amount;

    const updateResult = await tx.execute(
      sql`UPDATE credit_wallets
          SET balance = ${newBalance},
              version = version + 1
          WHERE workspace_id = ${workspaceId}
            AND credit_type = ${creditType}
            AND version = ${wallet.version}`,
    );

    if ((updateResult.count ?? 0) === 0) {
      throw new ConcurrencyError();
    }

    await tx.insert(creditLedger).values({
      workspaceId,
      creditType,
      operation: "refund",
      amount,
      balanceAfter: newBalance,
      source,
      referenceId: referenceId ?? null,
      idempotencyKey: idempotencyKey ?? null,
    });

    return newBalance;
  });
}

/**
 * Usage analytics: total consumed credits, optionally grouped by day/month
 * and broken down by provider.
 */
export async function getUsage(
  workspaceId: string,
  options: UsageOptions = {},
): Promise<UsageRow[]> {
  const { from, to, creditType, groupBy = "day" } = options;

  const dateFormat =
    groupBy === "month" ? "YYYY-MM" : "YYYY-MM-DD";

  const conditions: SQL[] = [
    eq(creditLedger.workspaceId, workspaceId),
    eq(creditLedger.operation, "burn"),
  ];

  if (creditType) {
    conditions.push(eq(creditLedger.creditType, creditType));
  }

  if (from && to) {
    conditions.push(between(creditLedger.createdAt, from, to));
  } else if (from) {
    conditions.push(sql`${creditLedger.createdAt} >= ${from}`);
  } else if (to) {
    conditions.push(sql`${creditLedger.createdAt} <= ${to}`);
  }

  const whereClause = and(...conditions);

  // Query: group by date bucket, then pivot credit types and providers
  const usageRows = await db.execute<{
    date: string;
    credit_type: string;
    source: string | null;
    total: string;
  }>(
    sql`SELECT
          to_char(${creditLedger.createdAt}, ${dateFormat}) AS date,
          ${creditLedger.creditType} AS credit_type,
          ${creditLedger.source} AS source,
          SUM(ABS(${creditLedger.amount})) AS total
        FROM ${creditLedger}
        WHERE ${whereClause}
        GROUP BY 1, 2, 3
        ORDER BY 1`,
  );

  // Pivot the flat rows into the UsageRow shape
  const map = new Map<string, UsageRow>();

  for (const row of usageRows) {
    let entry = map.get(row.date);
    if (!entry) {
      entry = {
        date: row.date,
        actionCredits: 0,
        dataCredits: 0,
        byProvider: {},
      };
      map.set(row.date, entry);
    }

    const amount = Number(row.total);
    if (row.credit_type === "action") {
      entry.actionCredits += amount;
    } else {
      entry.dataCredits += amount;
    }

    if (row.source) {
      entry.byProvider[row.source] =
        (entry.byProvider[row.source] ?? 0) + amount;
    }
  }

  return Array.from(map.values());
}

/**
 * Paginated transaction history from the credit ledger.
 */
export async function getTransactionHistory(
  workspaceId: string,
  options: TransactionHistoryOptions,
): Promise<{ entries: LedgerEntry[]; total: number }> {
  const { limit, offset, creditType } = options;

  const conditions: SQL[] = [eq(creditLedger.workspaceId, workspaceId)];

  if (creditType) {
    conditions.push(eq(creditLedger.creditType, creditType));
  }

  const whereClause = and(...conditions)!;

  const [entries, countResult] = await Promise.all([
    db
      .select({
        id: creditLedger.id,
        creditType: creditLedger.creditType,
        operation: creditLedger.operation,
        amount: creditLedger.amount,
        balanceAfter: creditLedger.balanceAfter,
        source: creditLedger.source,
        referenceId: creditLedger.referenceId,
        createdAt: creditLedger.createdAt,
      })
      .from(creditLedger)
      .where(whereClause)
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(creditLedger)
      .where(whereClause),
  ]);

  return {
    entries,
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * Non-throwing balance check — returns true when the wallet has enough.
 */
export async function checkBalance(
  workspaceId: string,
  creditType: CreditType,
  requiredAmount: number,
): Promise<boolean> {
  const balance = await getBalance(workspaceId, creditType);
  return balance >= requiredAmount;
}

/**
 * Initialize both action and data credit wallets for a workspace.
 * Sets the initial balance according to the workspace's plan.
 */
export async function initializeWallet(workspaceId: string): Promise<void> {
  // Look up the workspace plan
  const [workspace] = await db
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const plan = workspace.plan as keyof typeof PLAN_CREDITS;
  const allocation = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;

  await db.transaction(async (tx) => {
    // Insert action wallet
    await tx
      .insert(creditWallets)
      .values({
        workspaceId,
        creditType: "action",
        balance: allocation.actions,
        version: 0,
      })
      .onConflictDoNothing();

    // Insert data wallet
    await tx
      .insert(creditWallets)
      .values({
        workspaceId,
        creditType: "data",
        balance: allocation.dataCredits,
        version: 0,
      })
      .onConflictDoNothing();

    // Record the initial grants in the ledger
    await tx.insert(creditLedger).values([
      {
        workspaceId,
        creditType: "action",
        operation: "grant",
        amount: allocation.actions,
        balanceAfter: allocation.actions,
        source: `plan:${plan}:initial`,
      },
      {
        workspaceId,
        creditType: "data",
        operation: "grant",
        amount: allocation.dataCredits,
        balanceAfter: allocation.dataCredits,
        source: `plan:${plan}:initial`,
      },
    ]);
  });
}
