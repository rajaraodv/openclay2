import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { tables, columns } from "./tables";

export const enrichmentJobStatusEnum = pgEnum("enrichment_job_status", [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
]);

export const enrichmentProviders = pgTable("enrichment_providers", {
  id: text().primaryKey(),
  name: text().notNull(),
  category: text().notNull(),
  fieldsProvided: text("fields_provided").array().notNull(),
  defaultCreditCost: integer("default_credit_cost").notNull(),
  rateLimitRpm: integer("rate_limit_rpm").notNull(),
  apiBaseUrl: text("api_base_url"),
  configSchema: jsonb("config_schema"),
  isActive: boolean("is_active").notNull().default(true),
});

export const providerKeys = pgTable(
  "provider_keys",
  {
    id: uuid().defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => enrichmentProviders.id, { onDelete: "cascade" }),
    encryptedKey: text("encrypted_key").notNull(),
    iv: text().notNull(),
    authTag: text("auth_tag").notNull(),
    isValid: boolean("is_valid").notNull().default(true),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("provider_keys_workspace_provider_unique").on(
      t.workspaceId,
      t.providerId,
    ),
  ],
);

export const waterfallConfigs = pgTable("waterfall_configs", {
  id: uuid().defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  fieldType: text("field_type").notNull(),
  providerOrder: text("provider_order").array().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const enrichmentJobs = pgTable("enrichment_jobs", {
  id: uuid().defaultRandom().primaryKey(),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  columnId: uuid("column_id")
    .notNull()
    .references(() => columns.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  status: enrichmentJobStatusEnum().notNull().default("pending"),
  totalRows: integer("total_rows").notNull(),
  completedRows: integer("completed_rows").notNull().default(0),
  failedRows: integer("failed_rows").notNull().default(0),
  skippedRows: integer("skipped_rows").notNull().default(0),
  creditsConsumed: integer("credits_consumed").notNull().default(0),
  config: jsonb(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────

export const enrichmentProvidersRelations = relations(
  enrichmentProviders,
  ({ many }) => ({
    providerKeys: many(providerKeys),
  }),
);

export const providerKeysRelations = relations(providerKeys, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [providerKeys.workspaceId],
    references: [workspaces.id],
  }),
  provider: one(enrichmentProviders, {
    fields: [providerKeys.providerId],
    references: [enrichmentProviders.id],
  }),
}));

export const waterfallConfigsRelations = relations(
  waterfallConfigs,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [waterfallConfigs.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const enrichmentJobsRelations = relations(
  enrichmentJobs,
  ({ one }) => ({
    table: one(tables, {
      fields: [enrichmentJobs.tableId],
      references: [tables.id],
    }),
    column: one(columns, {
      fields: [enrichmentJobs.columnId],
      references: [columns.id],
    }),
    workspace: one(workspaces, {
      fields: [enrichmentJobs.workspaceId],
      references: [workspaces.id],
    }),
  }),
);
