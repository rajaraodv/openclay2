import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { tables } from "./tables";
import { providerKeys, waterfallConfigs, enrichmentJobs } from "./enrichment";
import { creditLedger, creditWallets } from "./credits";
import { integrations, webhooks, templates } from "./integrations";

export const planEnum = pgEnum("plan", [
  "free",
  "launch",
  "growth",
  "enterprise",
]);

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  plan: planEnum().notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  email: text().notNull().unique(),
  name: text().notNull(),
  avatarUrl: text("avatar_url"),
  image: text("image"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum().notNull().default("member"),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text(),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ── Relations ──────────────────────────────────────────────────────────

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  tables: many(tables),
  providerKeys: many(providerKeys),
  waterfallConfigs: many(waterfallConfigs),
  enrichmentJobs: many(enrichmentJobs),
  creditLedger: many(creditLedger),
  creditWallets: many(creditWallets),
  integrations: many(integrations),
  webhooks: many(webhooks),
  templates: many(templates),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  createdTables: many(tables),
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  }),
);
