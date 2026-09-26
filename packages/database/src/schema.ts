import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  blob,
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
    leaseOwner: text("lease_owner"),
    leasedUntil: integer("leased_until"),
    processedAt: integer("processed_at"),
  },
  (table) => [
    index("outbox_pending_idx").on(table.processedAt, table.availableAt),
    index("outbox_installation_idx").on(table.installationId, table.occurredAt),
  ],
);

export const activityEntries = sqliteTable(
  "activity_entries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id"),
    taskId: text("task_id"),
    actorUserId: text("actor_user_id"),
    operation: text("operation").notNull(),
    metadataJson: text("metadata_json").notNull(),
    occurredAt: integer("occurred_at").notNull(),
  },
  (table) => [
    index("activity_entries_organization_time_idx").on(table.organizationId, table.occurredAt),
    index("activity_entries_project_time_idx").on(table.projectId, table.occurredAt),
    index("activity_entries_task_time_idx").on(table.taskId, table.occurredAt),
  ],
);

export const invalidationEvents = sqliteTable(
  "invalidation_events",
  {
    sequence: integer("sequence").primaryKey({ autoIncrement: true }),
    outboxId: text("outbox_id").notNull().unique(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id"),
    resourceId: text("resource_id").notNull(),
    resourceType: text("resource_type").notNull(),
    topic: text("topic").notNull(),
    occurredAt: integer("occurred_at").notNull(),
  },
  (table) => [
    index("invalidation_events_organization_sequence_idx").on(table.organizationId, table.sequence),
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

export const organizations = sqliteTable(
  "organizations",
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
    uniqueIndex("organizations_installation_slug_unique").on(table.installationId, table.slug),
    index("organizations_installation_updated_idx").on(table.installationId, table.updatedAt),
    check("organizations_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("organizations_revision_positive", sql`${table.revision} > 0`),
  ],
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    uniqueIndex("teams_organization_name_unique").on(
      table.organizationId,
      sql`lower(${table.name})`,
    ),
    uniqueIndex("teams_organization_id_unique").on(table.organizationId, table.id),
    index("teams_organization_created_idx").on(table.organizationId, table.createdAt),
    check("teams_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("teams_revision_positive", sql`${table.revision} > 0`),
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
  currentOrganizationId: text("current_organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  revision: integer("revision").notNull().default(1),
});

export const organizationMembers = sqliteTable(
  "organization_members",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] }).notNull(),
    state: text("state", { enum: ["active", "suspended"] }).notNull(),
    joinedAt: integer("joined_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_state_idx").on(
      table.userId,
      table.state,
      table.organizationId,
    ),
    check("organization_members_role_valid", sql`${table.role} in ('owner', 'admin', 'member')`),
    check("organization_members_state_valid", sql`${table.state} in ('active', 'suspended')`),
  ],
);

export const projectFolders = sqliteTable(
  "project_folders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
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
    uniqueIndex("project_folders_organization_name_unique").on(
      table.organizationId,
      sql`lower(${table.name})`,
    ),
    uniqueIndex("project_folders_organization_position_unique").on(
      table.organizationId,
      table.position,
    ),
    uniqueIndex("project_folders_organization_id_unique").on(table.organizationId, table.id),
    check("project_folders_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("project_folders_position_valid", sql`${table.position} >= 0`),
    check("project_folders_revision_positive", sql`${table.revision} > 0`),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    folderId: text("folder_id"),
    key: text("key").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    access: text("access", { enum: ["organization", "restricted"] })
      .notNull()
      .default("organization"),
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
    uniqueIndex("projects_organization_key_unique").on(table.organizationId, table.key),
    uniqueIndex("projects_organization_slug_unique").on(table.organizationId, table.slug),
    uniqueIndex("projects_organization_id_unique").on(table.organizationId, table.id),
    uniqueIndex("projects_organization_folder_position_unique")
      .on(table.organizationId, sql`coalesce(${table.folderId}, '')`, table.position)
      .where(sql`${table.archivedAt} is null and ${table.deletedAt} is null`),
    index("projects_organization_state_idx").on(
      table.organizationId,
      table.deletedAt,
      table.archivedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.folderId],
      foreignColumns: [projectFolders.organizationId, projectFolders.id],
      name: "projects_organization_folder_fk",
    }).onDelete("restrict"),
    check("projects_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("projects_position_valid", sql`${table.position} >= 0`),
    check("projects_next_task_number_positive", sql`${table.nextTaskNumber} > 0`),
    check("projects_revision_positive", sql`${table.revision} > 0`),
    check("projects_access_valid", sql`${table.access} in ('organization', 'restricted')`),
  ],
);

export const projectStatuses = sqliteTable(
  "project_statuses",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
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
    uniqueIndex("project_statuses_organization_project_id_unique").on(
      table.organizationId,
      table.projectId,
      table.id,
    ),
    index("project_statuses_project_state_idx").on(table.projectId, table.archivedAt),
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
      name: "project_statuses_organization_project_fk",
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

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    number: integer("number").notNull(),
    parentTaskId: text("parent_task_id").references((): AnySQLiteColumn => tasks.id, {
      onDelete: "restrict",
    }),
    statusId: text("status_id").notNull(),
    teamId: text("team_id"),
    title: text("title").notNull(),
    description: text("description_markdown").notNull().default(""),
    attachmentCount: integer("attachment_count").notNull().default(0),
    dueDate: text("due_date"),
    priority: text("priority", { enum: ["low", "medium", "high"] })
      .notNull()
      .default("medium"),
    position: integer("position").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    archivedAt: integer("archived_at"),
    deletedAt: integer("deleted_at"),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    uniqueIndex("tasks_project_number_unique").on(table.projectId, table.number),
    uniqueIndex("tasks_organization_id_unique").on(table.organizationId, table.id),
    uniqueIndex("tasks_project_scope_position_unique")
      .on(table.projectId, table.statusId, sql`coalesce(${table.parentTaskId}, '')`, table.position)
      .where(sql`${table.archivedAt} is null and ${table.deletedAt} is null`),
    index("tasks_project_status_position_idx").on(
      table.projectId,
      table.statusId,
      table.parentTaskId,
      table.position,
    ),
    index("tasks_project_updated_idx").on(table.projectId, table.updatedAt),
    index("tasks_parent_idx").on(table.parentTaskId, table.archivedAt),
    index("tasks_due_date_idx").on(table.organizationId, table.dueDate),
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
      name: "tasks_organization_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.teamId],
      foreignColumns: [teams.organizationId, teams.id],
      name: "tasks_organization_team_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.projectId, table.statusId],
      foreignColumns: [
        projectStatuses.organizationId,
        projectStatuses.projectId,
        projectStatuses.id,
      ],
      name: "tasks_organization_project_status_fk",
    }).onDelete("restrict"),
    check("tasks_number_positive", sql`${table.number} > 0`),
    check("tasks_title_not_blank", sql`length(trim(${table.title})) > 0`),
    check("tasks_position_valid", sql`${table.position} >= 0`),
    check(
      "tasks_attachment_count_valid",
      sql`${table.attachmentCount} >= 0 and ${table.attachmentCount} <= 100`,
    ),
    check("tasks_revision_positive", sql`${table.revision} > 0`),
    check("tasks_priority_valid", sql`${table.priority} in ('low', 'medium', 'high')`),
    check(
      "tasks_due_date_valid",
      sql`${table.dueDate} is null or ${table.dueDate} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
    check(
      "tasks_parent_not_self",
      sql`${table.parentTaskId} is null or ${table.parentTaskId} <> ${table.id}`,
    ),
  ],
);

export const taskAttachments = sqliteTable(
  "task_attachments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    taskId: text("task_id").notNull(),
    commentId: text("comment_id"),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    content: blob("content", { mode: "buffer" }).notNull(),
    uploadedByUserId: text("uploaded_by_user_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("task_attachments_task_time_idx").on(table.taskId, table.createdAt),
    index("task_attachments_comment_time_idx").on(table.commentId, table.createdAt),
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
      name: "task_attachments_organization_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.taskId],
      foreignColumns: [tasks.organizationId, tasks.id],
      name: "task_attachments_organization_task_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.uploadedByUserId],
      foreignColumns: [organizationMembers.organizationId, organizationMembers.userId],
      name: "task_attachments_organization_uploader_fk",
    }).onDelete("restrict"),
    check("task_attachments_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("task_attachments_content_type_not_blank", sql`length(trim(${table.contentType})) > 0`),
    check("task_attachments_size_valid", sql`${table.size} > 0 and ${table.size} <= 5242880`),
  ],
);

export const taskComments = sqliteTable(
  "task_comments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    taskId: text("task_id").notNull(),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    body: text("body_markdown").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    index("task_comments_task_time_idx").on(table.taskId, table.createdAt),
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
      name: "task_comments_organization_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.taskId],
      foreignColumns: [tasks.organizationId, tasks.id],
      name: "task_comments_organization_task_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.authorUserId],
      foreignColumns: [organizationMembers.organizationId, organizationMembers.userId],
      name: "task_comments_organization_author_fk",
    }).onDelete("restrict"),
    check("task_comments_body_not_blank", sql`length(trim(${table.body})) > 0`),
    check("task_comments_revision_positive", sql`${table.revision} > 0`),
  ],
);

export const taskCommentReactions = sqliteTable(
  "task_comment_reactions",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => taskComments.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.userId, table.emoji] }),
    index("task_comment_reactions_comment_time_idx").on(table.commentId, table.createdAt),
    foreignKey({
      columns: [table.organizationId, table.userId],
      foreignColumns: [organizationMembers.organizationId, organizationMembers.userId],
      name: "task_comment_reactions_organization_member_fk",
    }).onDelete("cascade"),
    check("task_comment_reactions_emoji_not_blank", sql`length(trim(${table.emoji})) > 0`),
  ],
);

export const taskAssignees = sqliteTable(
  "task_assignees",
  {
    organizationId: text("organization_id").notNull(),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
    assignedByUserId: text("assigned_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    assignedAt: integer("assigned_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.userId] }),
    index("task_assignees_user_idx").on(table.organizationId, table.userId, table.taskId),
    foreignKey({
      columns: [table.organizationId, table.taskId],
      foreignColumns: [tasks.organizationId, tasks.id],
      name: "task_assignees_organization_task_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.userId],
      foreignColumns: [organizationMembers.organizationId, organizationMembers.userId],
      name: "task_assignees_organization_member_fk",
    }).onDelete("cascade"),
  ],
);

export const labels = sqliteTable(
  "labels",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id"),
    name: text("name").notNull(),
    comparisonKey: text("comparison_key").notNull(),
    color: text("color").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    archivedAt: integer("archived_at"),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    uniqueIndex("labels_organization_id_unique").on(table.organizationId, table.id),
    uniqueIndex("labels_scope_name_unique").on(
      table.organizationId,
      sql`coalesce(${table.projectId}, '')`,
      table.comparisonKey,
    ),
    index("labels_organization_project_state_idx").on(
      table.organizationId,
      table.projectId,
      table.archivedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
      name: "labels_organization_project_fk",
    }).onDelete("cascade"),
    check("labels_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("labels_comparison_key_not_blank", sql`length(${table.comparisonKey}) > 0`),
    check("labels_color_not_blank", sql`length(trim(${table.color})) > 0`),
    check("labels_revision_positive", sql`${table.revision} > 0`),
  ],
);

export const taskLabels = sqliteTable(
  "task_labels",
  {
    organizationId: text("organization_id").notNull(),
    taskId: text("task_id").notNull(),
    labelId: text("label_id").notNull(),
    appliedByUserId: text("applied_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    appliedAt: integer("applied_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.labelId] }),
    index("task_labels_label_idx").on(table.organizationId, table.labelId, table.taskId),
    foreignKey({
      columns: [table.organizationId, table.taskId],
      foreignColumns: [tasks.organizationId, tasks.id],
      name: "task_labels_organization_task_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.labelId],
      foreignColumns: [labels.organizationId, labels.id],
      name: "task_labels_organization_label_fk",
    }).onDelete("cascade"),
  ],
);

export const organizationRegistrationCommands = sqliteTable(
  "organization_registration_commands",
  {
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id, { onDelete: "restrict" }),
    key: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    state: text("state", { enum: ["pending", "completed"] }).notNull(),
    resultJson: text("result_json"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.installationId, table.key] }),
    index("organization_registration_commands_expiry_idx").on(table.expiresAt),
    check(
      "organization_registration_commands_state_valid",
      sql`${table.state} in ('pending', 'completed')`,
    ),
    check(
      "organization_registration_commands_result_complete",
      sql`(${table.state} = 'pending' and ${table.resultJson} is null)
          or (${table.state} = 'completed' and ${table.resultJson} is not null)`,
    ),
  ],
);

export const idempotencyRecords = sqliteTable(
  "idempotency_records",
  {
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    scopeKey: text("scope_key").notNull(),
    operation: text("operation").notNull(),
    key: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    state: text("state", { enum: ["pending", "completed"] }).notNull(),
    responseStatus: integer("response_status"),
    responseJson: text("response_json"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.actorUserId, table.scopeKey, table.operation, table.key] }),
    index("idempotency_records_expiry_idx").on(table.expiresAt),
    check("idempotency_records_state_valid", sql`${table.state} in ('pending', 'completed')`),
    check(
      "idempotency_records_response_complete",
      sql`(${table.state} = 'pending' and ${table.responseStatus} is null and ${table.responseJson} is null)
          or (${table.state} = 'completed' and ${table.responseStatus} is not null and ${table.responseJson} is not null)`,
    ),
  ],
);

export const auditEntries = sqliteTable(
  "audit_entries",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id, { onDelete: "restrict" }),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
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
    index("audit_entries_organization_time_idx").on(table.organizationId, table.occurredAt),
    check(
      "audit_entries_outcome_valid",
      sql`${table.outcome} in ('succeeded', 'denied', 'failed')`,
    ),
  ],
);

export const databaseSchema = {
  activityEntries,
  auditEntries,
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  installations,
  idempotencyRecords,
  invalidationEvents,
  labels,
  outboxMessages,
  projectFolders,
  projectPreferences,
  projectStatuses,
  projects,
  taskAssignees,
  taskCommentReactions,
  taskComments,
  taskLabels,
  tasks,
  teams,
  userProfiles,
  organizationMembers,
  organizations,
};
