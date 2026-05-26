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

export const actionTypeEnum = pgEnum("action_type", [
  "crm_push",
  "http_request",
  "webhook",
  "slack",
  "write_table",
  "email_sequence",
]);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid().defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text().notNull(),
    nangoConnectionId: text("nango_connection_id"),
    status: text().notNull().default("active"),
    config: jsonb().notNull().default({}),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("integrations_workspace_provider_unique").on(
      t.workspaceId,
      t.provider,
    ),
  ],
);

export const webhooks = pgTable("webhooks", {
  id: uuid().defaultRandom().primaryKey(),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  secretToken: text("secret_token").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  submissionCount: integer("submission_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const actions = pgTable("actions", {
  id: uuid().defaultRandom().primaryKey(),
  columnId: uuid("column_id")
    .notNull()
    .references(() => columns.id, { onDelete: "cascade" }),
  actionType: actionTypeEnum("action_type").notNull(),
  config: jsonb().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  category: text().notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
  config: jsonb().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────

export const integrationsRelations = relations(integrations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [integrations.workspaceId],
    references: [workspaces.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  table: one(tables, {
    fields: [webhooks.tableId],
    references: [tables.id],
  }),
  workspace: one(workspaces, {
    fields: [webhooks.workspaceId],
    references: [workspaces.id],
  }),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  column: one(columns, {
    fields: [actions.columnId],
    references: [columns.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [templates.workspaceId],
    references: [workspaces.id],
  }),
}));
