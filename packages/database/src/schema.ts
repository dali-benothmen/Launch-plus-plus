import { sql } from "drizzle-orm";
import {
  check,
  customType,
  foreignKey,
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

export const projectFolders = sqliteTable(
  "project_folders",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    uniqueIndex("project_folders_workspace_name_unique").on(
      table.workspaceId,
      sql`lower(${table.name})`,
    ),
    uniqueIndex("project_folders_workspace_position_unique").on(table.workspaceId, table.position),
    uniqueIndex("project_folders_workspace_id_unique").on(table.workspaceId, table.id),
    check("project_folders_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("project_folders_position_valid", sql`${table.position} >= 0`),
    check("project_folders_revision_positive", sql`${table.revision} > 0`),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    folderId: text("folder_id"),
    key: text("key").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    access: text("access", { enum: ["workspace", "restricted"] })
      .notNull()
      .default("workspace"),
    position: integer("position").notNull(),
    nextTaskNumber: integer("next_task_number").notNull().default(1),
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
    uniqueIndex("projects_workspace_key_unique").on(table.workspaceId, table.key),
    uniqueIndex("projects_workspace_slug_unique").on(table.workspaceId, table.slug),
    uniqueIndex("projects_workspace_id_unique").on(table.workspaceId, table.id),
    uniqueIndex("projects_workspace_folder_position_unique")
      .on(table.workspaceId, sql`coalesce(${table.folderId}, '')`, table.position)
      .where(sql`${table.archivedAt} is null and ${table.deletedAt} is null`),
    index("projects_workspace_state_idx").on(table.workspaceId, table.deletedAt, table.archivedAt),
    foreignKey({
      columns: [table.workspaceId, table.folderId],
      foreignColumns: [projectFolders.workspaceId, projectFolders.id],
      name: "projects_workspace_folder_fk",
    }).onDelete("restrict"),
    check("projects_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("projects_position_valid", sql`${table.position} >= 0`),
    check("projects_next_task_number_positive", sql`${table.nextTaskNumber} > 0`),
    check("projects_revision_positive", sql`${table.revision} > 0`),
    check("projects_access_valid", sql`${table.access} in ('workspace', 'restricted')`),
  ],
);

export const projectStatuses = sqliteTable(
  "project_statuses",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    projectId: text("project_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon"),
    position: integer("position").notNull(),
    category: text("category", { enum: ["backlog", "active", "done"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    archivedAt: integer("archived_at"),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    uniqueIndex("project_statuses_project_position_unique")
      .on(table.projectId, table.position)
      .where(sql`${table.archivedAt} is null`),
    uniqueIndex("project_statuses_project_name_unique").on(
      table.projectId,
      sql`lower(${table.name})`,
    ),
    index("project_statuses_project_state_idx").on(table.projectId, table.archivedAt),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "project_statuses_workspace_project_fk",
    }).onDelete("cascade"),
    check("project_statuses_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("project_statuses_color_not_blank", sql`length(trim(${table.color})) > 0`),
    check("project_statuses_position_valid", sql`${table.position} >= 0`),
    check(
      "project_statuses_category_valid",
      sql`${table.category} in ('backlog', 'active', 'done')`,
    ),
    check("project_statuses_revision_positive", sql`${table.revision} > 0`),
  ],
);

export const projectPreferences = sqliteTable(
  "project_preferences",
  {
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    lastOpenedAt: integer("last_opened_at"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.projectId] }),
    index("project_preferences_user_favorite_idx").on(
      table.userId,
      table.favorite,
      table.updatedAt,
    ),
    index("project_preferences_user_recent_idx").on(table.userId, table.lastOpenedAt),
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
  projectFolders,
  projectPreferences,
  projectStatuses,
  projects,
  userProfiles,
  workspaceMembers,
  workspaces,
};
