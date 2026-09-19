import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const authDate = customType<{ data: Date; driverData: string }>({
  dataType: () => "date",
  fromDriver: (value) => new Date(value),
  toDriver: (value) => value.toISOString(),
});

export const installations = sqliteTable("installations", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});

export const outboxMessages = sqliteTable(
  "outbox_messages",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id, { onDelete: "restrict" }),
    topic: text("topic").notNull(),
    payloadJson: text("payload_json").notNull(),
    occurredAt: integer("occurred_at").notNull(),
    availableAt: integer("available_at").notNull(),
    correlationId: text("correlation_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    leasedUntil: integer("leased_until"),
    processedAt: integer("processed_at"),
  },
  (table) => [
    index("outbox_pending_idx").on(table.processedAt, table.availableAt),
    index("outbox_installation_idx").on(table.installationId, table.occurredAt),
  ],
);

export const authUsers = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: authDate("createdAt").notNull(),
  updatedAt: authDate("updatedAt").notNull(),
});

export const authSessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: authDate("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: authDate("createdAt").notNull(),
    updatedAt: authDate("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const authAccounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: authDate("accessTokenExpiresAt"),
    refreshTokenExpiresAt: authDate("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: authDate("createdAt").notNull(),
    updatedAt: authDate("updatedAt").notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const authVerifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: authDate("expiresAt").notNull(),
    createdAt: authDate("createdAt").notNull(),
    updatedAt: authDate("updatedAt").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    archivedAt: integer("archived_at"),
    deletedAt: integer("deleted_at"),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    uniqueIndex("workspaces_installation_name_unique").on(
      table.installationId,
      sql`lower(${table.name})`,
    ),
    uniqueIndex("workspaces_installation_slug_unique").on(table.installationId, table.slug),
    index("workspaces_installation_updated_idx").on(table.installationId, table.updatedAt),
    check("workspaces_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("workspaces_revision_positive", sql`${table.revision} > 0`),
  ],
);

export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarAssetId: text("avatar_asset_id"),
  locale: text("locale").notNull().default("en"),
  timeZone: text("time_zone").notNull().default("UTC"),
  currentWorkspaceId: text("current_workspace_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  revision: integer("revision").notNull().default(1),
});

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] }).notNull(),
    state: text("state", { enum: ["active", "suspended"] }).notNull(),
    joinedAt: integer("joined_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_state_idx").on(table.userId, table.state, table.workspaceId),
    check("workspace_members_role_valid", sql`${table.role} in ('owner', 'admin', 'member')`),
    check("workspace_members_state_valid", sql`${table.state} in ('active', 'suspended')`),
  ],
);

export const auditEntries = sqliteTable(
  "audit_entries",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id, { onDelete: "restrict" }),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "restrict" }),
    actorType: text("actor_type", { enum: ["user", "operator", "system"] }).notNull(),
    actorId: text("actor_id"),
    operation: text("operation").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    outcome: text("outcome", { enum: ["succeeded", "denied", "failed"] }).notNull(),
    metadataJson: text("metadata_json").notNull(),
    occurredAt: integer("occurred_at").notNull(),
    correlationId: text("correlation_id").notNull(),
  },
  (table) => [
    index("audit_entries_installation_time_idx").on(table.installationId, table.occurredAt),
    index("audit_entries_workspace_time_idx").on(table.workspaceId, table.occurredAt),
    check(
      "audit_entries_outcome_valid",
      sql`${table.outcome} in ('succeeded', 'denied', 'failed')`,
    ),
  ],
);

export const databaseSchema = {
  auditEntries,
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  installations,
  outboxMessages,
  userProfiles,
  workspaceMembers,
  workspaces,
};
