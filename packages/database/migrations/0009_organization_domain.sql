ALTER TABLE `workspace_members` RENAME TO `organization_members`;--> statement-breakpoint
ALTER TABLE `workspaces` RENAME TO `organizations`;--> statement-breakpoint
ALTER TABLE `organization_members` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `activity_entries` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `audit_entries` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `invalidation_events` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `labels` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `project_folders` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `project_statuses` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `projects` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `task_assignees` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `task_comments` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `task_labels` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `tasks` RENAME COLUMN "workspace_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE `user_profiles` RENAME COLUMN "current_workspace_id" TO "current_organization_id";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_organization_members` (
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`state` text NOT NULL,
	`joined_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `user_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "organization_members_role_valid" CHECK("__new_organization_members"."role" in ('owner', 'admin', 'member')),
	CONSTRAINT "organization_members_state_valid" CHECK("__new_organization_members"."state" in ('active', 'suspended'))
);
--> statement-breakpoint
INSERT INTO `__new_organization_members`("organization_id", "user_id", "role", "state", "joined_at", "updated_at") SELECT "organization_id", "user_id", "role", "state", "joined_at", "updated_at" FROM `organization_members`;--> statement-breakpoint
DROP TABLE `organization_members`;--> statement-breakpoint
ALTER TABLE `__new_organization_members` RENAME TO `organization_members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `organization_members_user_state_idx` ON `organization_members` (`user_id`,`state`,`organization_id`);--> statement-breakpoint
CREATE TABLE `__new_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`deleted_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`installation_id`) REFERENCES `installations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "organizations_name_not_blank" CHECK(length(trim("__new_organizations"."name")) > 0),
	CONSTRAINT "organizations_revision_positive" CHECK("__new_organizations"."revision" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_organizations`("id", "installation_id", "slug", "name", "created_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision") SELECT "id", "installation_id", "slug", "name", "created_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision" FROM `organizations`;--> statement-breakpoint
DROP TABLE `organizations`;--> statement-breakpoint
ALTER TABLE `__new_organizations` RENAME TO `organizations`;--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_installation_name_unique` ON `organizations` (`installation_id`,`lower("name")`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_installation_slug_unique` ON `organizations` (`installation_id`,`slug`);--> statement-breakpoint
CREATE INDEX `organizations_installation_updated_idx` ON `organizations` (`installation_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_activity_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text,
	`task_id` text,
	`actor_user_id` text,
	`operation` text NOT NULL,
	`metadata_json` text NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_activity_entries`("id", "organization_id", "project_id", "task_id", "actor_user_id", "operation", "metadata_json", "occurred_at") SELECT "id", "organization_id", "project_id", "task_id", "actor_user_id", "operation", "metadata_json", "occurred_at" FROM `activity_entries`;--> statement-breakpoint
DROP TABLE `activity_entries`;--> statement-breakpoint
ALTER TABLE `__new_activity_entries` RENAME TO `activity_entries`;--> statement-breakpoint
CREATE INDEX `activity_entries_organization_time_idx` ON `activity_entries` (`organization_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `activity_entries_project_time_idx` ON `activity_entries` (`project_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `activity_entries_task_time_idx` ON `activity_entries` (`task_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `__new_audit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`organization_id` text,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`operation` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`outcome` text NOT NULL,
	`metadata_json` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`correlation_id` text NOT NULL,
	FOREIGN KEY (`installation_id`) REFERENCES `installations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "audit_entries_outcome_valid" CHECK("__new_audit_entries"."outcome" in ('succeeded', 'denied', 'failed'))
);
--> statement-breakpoint
INSERT INTO `__new_audit_entries`("id", "installation_id", "organization_id", "actor_type", "actor_id", "operation", "target_type", "target_id", "outcome", "metadata_json", "occurred_at", "correlation_id") SELECT "id", "installation_id", "organization_id", "actor_type", "actor_id", "operation", "target_type", "target_id", "outcome", "metadata_json", "occurred_at", "correlation_id" FROM `audit_entries`;--> statement-breakpoint
DROP TABLE `audit_entries`;--> statement-breakpoint
ALTER TABLE `__new_audit_entries` RENAME TO `audit_entries`;--> statement-breakpoint
CREATE INDEX `audit_entries_installation_time_idx` ON `audit_entries` (`installation_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_entries_organization_time_idx` ON `audit_entries` (`organization_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `__new_invalidation_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outbox_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text,
	`resource_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`topic` text NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_invalidation_events`("sequence", "outbox_id", "organization_id", "project_id", "resource_id", "resource_type", "topic", "occurred_at") SELECT "sequence", "outbox_id", "organization_id", "project_id", "resource_id", "resource_type", "topic", "occurred_at" FROM `invalidation_events`;--> statement-breakpoint
DROP TABLE `invalidation_events`;--> statement-breakpoint
ALTER TABLE `__new_invalidation_events` RENAME TO `invalidation_events`;--> statement-breakpoint
CREATE UNIQUE INDEX `invalidation_events_outbox_id_unique` ON `invalidation_events` (`outbox_id`);--> statement-breakpoint
CREATE INDEX `invalidation_events_organization_sequence_idx` ON `invalidation_events` (`organization_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `__new_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`comparison_key` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "labels_name_not_blank" CHECK(length(trim("__new_labels"."name")) > 0),
	CONSTRAINT "labels_comparison_key_not_blank" CHECK(length("__new_labels"."comparison_key") > 0),
	CONSTRAINT "labels_color_not_blank" CHECK(length(trim("__new_labels"."color")) > 0),
	CONSTRAINT "labels_revision_positive" CHECK("__new_labels"."revision" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_labels`("id", "organization_id", "project_id", "name", "comparison_key", "color", "created_at", "updated_at", "archived_at", "revision") SELECT "id", "organization_id", "project_id", "name", "comparison_key", "color", "created_at", "updated_at", "archived_at", "revision" FROM `labels`;--> statement-breakpoint
DROP TABLE `labels`;--> statement-breakpoint
ALTER TABLE `__new_labels` RENAME TO `labels`;--> statement-breakpoint
CREATE UNIQUE INDEX `labels_organization_id_unique` ON `labels` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `labels_scope_name_unique` ON `labels` (`organization_id`,coalesce("project_id", ''),`comparison_key`);--> statement-breakpoint
CREATE INDEX `labels_organization_project_state_idx` ON `labels` (`organization_id`,`project_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `__new_project_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "project_folders_name_not_blank" CHECK(length(trim("__new_project_folders"."name")) > 0),
	CONSTRAINT "project_folders_position_valid" CHECK("__new_project_folders"."position" >= 0),
	CONSTRAINT "project_folders_revision_positive" CHECK("__new_project_folders"."revision" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_project_folders`("id", "organization_id", "name", "position", "created_by_user_id", "created_at", "updated_at", "revision") SELECT "id", "organization_id", "name", "position", "created_by_user_id", "created_at", "updated_at", "revision" FROM `project_folders`;--> statement-breakpoint
DROP TABLE `project_folders`;--> statement-breakpoint
ALTER TABLE `__new_project_folders` RENAME TO `project_folders`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_folders_organization_name_unique` ON `project_folders` (`organization_id`,`lower("name")`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_folders_organization_position_unique` ON `project_folders` (`organization_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_folders_organization_id_unique` ON `project_folders` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `__new_project_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text,
	`position` integer NOT NULL,
	`category` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "project_statuses_name_not_blank" CHECK(length(trim("__new_project_statuses"."name")) > 0),
	CONSTRAINT "project_statuses_color_not_blank" CHECK(length(trim("__new_project_statuses"."color")) > 0),
	CONSTRAINT "project_statuses_position_valid" CHECK("__new_project_statuses"."position" >= 0),
	CONSTRAINT "project_statuses_category_valid" CHECK("__new_project_statuses"."category" in ('backlog', 'active', 'done')),
	CONSTRAINT "project_statuses_revision_positive" CHECK("__new_project_statuses"."revision" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_project_statuses`("id", "organization_id", "project_id", "name", "color", "icon", "position", "category", "created_at", "updated_at", "archived_at", "revision") SELECT "id", "organization_id", "project_id", "name", "color", "icon", "position", "category", "created_at", "updated_at", "archived_at", "revision" FROM `project_statuses`;--> statement-breakpoint
DROP TABLE `project_statuses`;--> statement-breakpoint
ALTER TABLE `__new_project_statuses` RENAME TO `project_statuses`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_statuses_project_position_unique` ON `project_statuses` (`project_id`,`position`) WHERE "project_statuses"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `project_statuses_project_name_unique` ON `project_statuses` (`project_id`,`lower("name")`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_statuses_organization_project_id_unique` ON `project_statuses` (`organization_id`,`project_id`,`id`);--> statement-breakpoint
CREATE INDEX `project_statuses_project_state_idx` ON `project_statuses` (`project_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`folder_id` text,
	`key` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`access` text DEFAULT 'organization' NOT NULL,
	`position` integer NOT NULL,
	`next_task_number` integer DEFAULT 1 NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`deleted_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`folder_id`) REFERENCES `project_folders`(`organization_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "projects_name_not_blank" CHECK(length(trim("__new_projects"."name")) > 0),
	CONSTRAINT "projects_position_valid" CHECK("__new_projects"."position" >= 0),
	CONSTRAINT "projects_next_task_number_positive" CHECK("__new_projects"."next_task_number" > 0),
	CONSTRAINT "projects_revision_positive" CHECK("__new_projects"."revision" > 0),
	CONSTRAINT "projects_access_valid" CHECK("__new_projects"."access" in ('organization', 'restricted'))
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "organization_id", "folder_id", "key", "slug", "name", "description", "access", "position", "next_task_number", "created_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision") SELECT "id", "organization_id", "folder_id", "key", "slug", "name", "description", CASE WHEN "access" = 'workspace' THEN 'organization' ELSE "access" END, "position", "next_task_number", "created_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_organization_key_unique` ON `projects` (`organization_id`,`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_organization_slug_unique` ON `projects` (`organization_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_organization_id_unique` ON `projects` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_organization_folder_position_unique` ON `projects` (`organization_id`,coalesce("folder_id", ''),`position`) WHERE "projects"."archived_at" is null and "projects"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `projects_organization_state_idx` ON `projects` (`organization_id`,`deleted_at`,`archived_at`);--> statement-breakpoint
CREATE TABLE `__new_task_assignees` (
	`organization_id` text NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`assigned_by_user_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	PRIMARY KEY(`task_id`, `user_id`),
	FOREIGN KEY (`assigned_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`task_id`) REFERENCES `tasks`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`user_id`) REFERENCES `organization_members`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_task_assignees`("organization_id", "task_id", "user_id", "assigned_by_user_id", "assigned_at") SELECT "organization_id", "task_id", "user_id", "assigned_by_user_id", "assigned_at" FROM `task_assignees`;--> statement-breakpoint
DROP TABLE `task_assignees`;--> statement-breakpoint
ALTER TABLE `__new_task_assignees` RENAME TO `task_assignees`;--> statement-breakpoint
CREATE INDEX `task_assignees_user_idx` ON `task_assignees` (`organization_id`,`user_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `__new_task_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`body_markdown` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`task_id`) REFERENCES `tasks`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`author_user_id`) REFERENCES `organization_members`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_comments_body_not_blank" CHECK(length(trim("__new_task_comments"."body_markdown")) > 0),
	CONSTRAINT "task_comments_revision_positive" CHECK("__new_task_comments"."revision" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_task_comments`("id", "organization_id", "project_id", "task_id", "author_user_id", "body_markdown", "created_at", "updated_at", "revision") SELECT "id", "organization_id", "project_id", "task_id", "author_user_id", "body_markdown", "created_at", "updated_at", "revision" FROM `task_comments`;--> statement-breakpoint
DROP TABLE `task_comments`;--> statement-breakpoint
ALTER TABLE `__new_task_comments` RENAME TO `task_comments`;--> statement-breakpoint
CREATE INDEX `task_comments_task_time_idx` ON `task_comments` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_task_labels` (
	`organization_id` text NOT NULL,
	`task_id` text NOT NULL,
	`label_id` text NOT NULL,
	`applied_by_user_id` text NOT NULL,
	`applied_at` integer NOT NULL,
	PRIMARY KEY(`task_id`, `label_id`),
	FOREIGN KEY (`applied_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`task_id`) REFERENCES `tasks`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`label_id`) REFERENCES `labels`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_task_labels`("organization_id", "task_id", "label_id", "applied_by_user_id", "applied_at") SELECT "organization_id", "task_id", "label_id", "applied_by_user_id", "applied_at" FROM `task_labels`;--> statement-breakpoint
DROP TABLE `task_labels`;--> statement-breakpoint
ALTER TABLE `__new_task_labels` RENAME TO `task_labels`;--> statement-breakpoint
CREATE INDEX `task_labels_label_idx` ON `task_labels` (`organization_id`,`label_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`number` integer NOT NULL,
	`parent_task_id` text,
	`status_id` text NOT NULL,
	`title` text NOT NULL,
	`description_markdown` text DEFAULT '' NOT NULL,
	`due_date` text,
	`position` integer NOT NULL,
	`created_by_user_id` text NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`deleted_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`project_id`,`status_id`) REFERENCES `project_statuses`(`organization_id`,`project_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "tasks_number_positive" CHECK("__new_tasks"."number" > 0),
	CONSTRAINT "tasks_title_not_blank" CHECK(length(trim("__new_tasks"."title")) > 0),
	CONSTRAINT "tasks_position_valid" CHECK("__new_tasks"."position" >= 0),
	CONSTRAINT "tasks_revision_positive" CHECK("__new_tasks"."revision" > 0),
	CONSTRAINT "tasks_due_date_valid" CHECK("__new_tasks"."due_date" is null or "__new_tasks"."due_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "tasks_parent_not_self" CHECK("__new_tasks"."parent_task_id" is null or "__new_tasks"."parent_task_id" <> "__new_tasks"."id")
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "organization_id", "project_id", "number", "parent_task_id", "status_id", "title", "description_markdown", "due_date", "position", "created_by_user_id", "updated_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision") SELECT "id", "organization_id", "project_id", "number", "parent_task_id", "status_id", "title", "description_markdown", "due_date", "position", "created_by_user_id", "updated_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_number_unique` ON `tasks` (`project_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_organization_id_unique` ON `tasks` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_scope_position_unique` ON `tasks` (`project_id`,`status_id`,coalesce("parent_task_id", ''),`position`) WHERE "tasks"."archived_at" is null and "tasks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `tasks_project_status_position_idx` ON `tasks` (`project_id`,`status_id`,`parent_task_id`,`position`);--> statement-breakpoint
CREATE INDEX `tasks_project_updated_idx` ON `tasks` (`project_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `tasks_parent_idx` ON `tasks` (`parent_task_id`,`archived_at`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`organization_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `__new_user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`avatar_asset_id` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`current_organization_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_user_profiles`("user_id", "display_name", "avatar_asset_id", "locale", "time_zone", "current_organization_id", "created_at", "updated_at", "revision") SELECT "user_id", "display_name", "avatar_asset_id", "locale", "time_zone", "current_organization_id", "created_at", "updated_at", "revision" FROM `user_profiles`;--> statement-breakpoint
DROP TABLE `user_profiles`;--> statement-breakpoint
ALTER TABLE `__new_user_profiles` RENAME TO `user_profiles`;--> statement-breakpoint
DROP TABLE `search_documents`;--> statement-breakpoint
CREATE VIRTUAL TABLE `search_documents` USING fts5(
	`resource_id` UNINDEXED,
	`resource_type` UNINDEXED,
	`organization_id` UNINDEXED,
	`project_id` UNINDEXED,
	`title`,
	`subtitle`,
	`body`,
	tokenize='unicode61 remove_diacritics 2'
);--> statement-breakpoint
INSERT INTO `search_documents` (
	`resource_id`, `resource_type`, `organization_id`, `project_id`, `title`, `subtitle`, `body`
)
SELECT project.id, 'project', project.organization_id, project.id, project.name,
	project.key || ' · ' || organization.name, project.description
FROM projects project
INNER JOIN organizations organization ON organization.id = project.organization_id
WHERE project.archived_at IS NULL AND project.deleted_at IS NULL
	AND organization.archived_at IS NULL AND organization.deleted_at IS NULL;--> statement-breakpoint
INSERT INTO `search_documents` (
	`resource_id`, `resource_type`, `organization_id`, `project_id`, `title`, `subtitle`, `body`
)
SELECT task.id, 'task', task.organization_id, task.project_id, task.title,
	project.key || '-' || task.number || ' · ' || project.name, task.description_markdown
FROM tasks task
INNER JOIN projects project ON project.id = task.project_id
WHERE task.archived_at IS NULL AND task.deleted_at IS NULL
	AND project.archived_at IS NULL AND project.deleted_at IS NULL;
