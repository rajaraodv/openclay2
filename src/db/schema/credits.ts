import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const creditTypeEnum = pgEnum("credit_type", ["action", "data"]);

export const creditOperationEnum = pgEnum("credit_operation", [
  "grant",
  "burn",
  "expire",
  "refund",
  "rollover",
]);

export const creditLedger = pgTable("credit_ledger", {
  id: uuid().defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  creditType: creditTypeEnum("credit_type").notNull(),
  operation: creditOperationEnum().notNull(),
  amount: integer().notNull(),
  balanceAfter: integer("balance_after").notNull(),
  source: text(),
  referenceId: text("reference_id"),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const creditWallets = pgTable(
  "credit_wallets",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    creditType: creditTypeEnum("credit_type").notNull(),
    balance: integer().notNull().default(0),
    version: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.creditType] })],
);

// ── Relations ──────────────────────────────────────────────────────────

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [creditLedger.workspaceId],
    references: [workspaces.id],
  }),
}));

export const creditWalletsRelations = relations(creditWallets, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [creditWallets.workspaceId],
    references: [workspaces.id],
  }),
}));
