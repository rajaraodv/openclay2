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
  real,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { workspaces, users } from "./workspaces";
import { enrichmentJobs } from "./enrichment";
import { webhooks, actions } from "./integrations";

export const dataTypeEnum = pgEnum("data_type", [
  "text",
  "url",
  "number",
  "date",
  "select",
  "multi_select",
  "checkbox",
  "currency",
  "email",
  "image",
  "assigned_to",
]);

export const columnTypeEnum = pgEnum("column_type", [
  "manual",
  "enrichment",
  "formula",
  "ai_agent",
  "action",
]);

export const cellStatusEnum = pgEnum("cell_status", [
  "empty",
  "pending",
  "running",
  "complete",
  "error",
  "skipped",
]);

export const tables = pgTable("tables", {
  id: uuid().defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  rowCount: integer("row_count").notNull().default(0),
  autoRun: boolean("auto_run").notNull().default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const columns = pgTable("columns", {
  id: uuid().defaultRandom().primaryKey(),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  name: text().notNull(),
  dataType: dataTypeEnum("data_type").notNull().default("text"),
  columnType: columnTypeEnum("column_type").notNull().default("manual"),
  position: integer().notNull(),
  width: integer().notNull().default(200),
  pinned: boolean().notNull().default(false),
  hidden: boolean().notNull().default(false),
  config: jsonb().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rows = pgTable(
  "rows",
  {
    id: uuid().defaultRandom().primaryKey(),
    tableId: uuid("table_id")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("rows_table_id_idx").on(t.tableId)],
);

export const cells = pgTable(
  "cells",
  {
    id: uuid().defaultRandom().primaryKey(),
    rowId: uuid("row_id")
      .notNull()
      .references(() => rows.id, { onDelete: "cascade" }),
    columnId: uuid("column_id")
      .notNull()
      .references(() => columns.id, { onDelete: "cascade" }),
    value: jsonb(),
    rawValue: jsonb("raw_value"),
    status: cellStatusEnum().notNull().default("empty"),
    source: text(),
    confidence: real(),
    errorMessage: text("error_message"),
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),
  },
  (t) => [
    unique("cells_row_id_column_id_unique").on(t.rowId, t.columnId),
    index("cells_row_id_idx").on(t.rowId),
    index("cells_column_id_idx").on(t.columnId),
    index("cells_status_idx").on(t.status),
  ],
);

export const views = pgTable("views", {
  id: uuid().defaultRandom().primaryKey(),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  name: text().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  filters: jsonb().notNull().default([]),
  sorts: jsonb().notNull().default([]),
  hiddenColumns: text("hidden_columns").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────

export const tablesRelations = relations(tables, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tables.workspaceId],
    references: [workspaces.id],
  }),
  createdByUser: one(users, {
    fields: [tables.createdBy],
    references: [users.id],
  }),
  columns: many(columns),
  rows: many(rows),
  views: many(views),
  enrichmentJobs: many(enrichmentJobs),
  webhooks: many(webhooks),
}));

export const columnsRelations = relations(columns, ({ one, many }) => ({
  table: one(tables, {
    fields: [columns.tableId],
    references: [tables.id],
  }),
  cells: many(cells),
  actions: many(actions),
  enrichmentJobs: many(enrichmentJobs),
}));

export const rowsRelations = relations(rows, ({ one, many }) => ({
  table: one(tables, {
    fields: [rows.tableId],
    references: [tables.id],
  }),
  cells: many(cells),
}));

export const cellsRelations = relations(cells, ({ one }) => ({
  row: one(rows, {
    fields: [cells.rowId],
    references: [rows.id],
  }),
  column: one(columns, {
    fields: [cells.columnId],
    references: [columns.id],
  }),
}));

export const viewsRelations = relations(views, ({ one }) => ({
  table: one(tables, {
    fields: [views.tableId],
    references: [tables.id],
  }),
}));
