CREATE TABLE `project_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "project_folders_name_not_blank" CHECK(length(trim("project_folders"."name")) > 0),
	CONSTRAINT "project_folders_position_valid" CHECK("project_folders"."position" >= 0),
	CONSTRAINT "project_folders_revision_positive" CHECK("project_folders"."revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_folders_workspace_name_unique` ON `project_folders` (`workspace_id`,lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX `project_folders_workspace_position_unique` ON `project_folders` (`workspace_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_folders_workspace_id_unique` ON `project_folders` (`workspace_id`,`id`);--> statement-breakpoint
CREATE TABLE `project_preferences` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`last_opened_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `project_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_preferences_user_favorite_idx` ON `project_preferences` (`user_id`,`favorite`,`updated_at`);--> statement-breakpoint
CREATE INDEX `project_preferences_user_recent_idx` ON `project_preferences` (`user_id`,`last_opened_at`);--> statement-breakpoint
CREATE TABLE `project_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
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
	FOREIGN KEY (`workspace_id`,`project_id`) REFERENCES `projects`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "project_statuses_name_not_blank" CHECK(length(trim("project_statuses"."name")) > 0),
	CONSTRAINT "project_statuses_color_not_blank" CHECK(length(trim("project_statuses"."color")) > 0),
	CONSTRAINT "project_statuses_position_valid" CHECK("project_statuses"."position" >= 0),
	CONSTRAINT "project_statuses_category_valid" CHECK("project_statuses"."category" in ('backlog', 'active', 'done')),
	CONSTRAINT "project_statuses_revision_positive" CHECK("project_statuses"."revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_statuses_project_position_unique` ON `project_statuses` (`project_id`,`position`) WHERE "project_statuses"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `project_statuses_project_name_unique` ON `project_statuses` (`project_id`,lower("name"));--> statement-breakpoint
CREATE INDEX `project_statuses_project_state_idx` ON `project_statuses` (`project_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`folder_id` text,
	`key` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`access` text DEFAULT 'workspace' NOT NULL,
	`position` integer NOT NULL,
	`next_task_number` integer DEFAULT 1 NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`deleted_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`folder_id`) REFERENCES `project_folders`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "projects_name_not_blank" CHECK(length(trim("projects"."name")) > 0),
	CONSTRAINT "projects_position_valid" CHECK("projects"."position" >= 0),
	CONSTRAINT "projects_next_task_number_positive" CHECK("projects"."next_task_number" > 0),
	CONSTRAINT "projects_revision_positive" CHECK("projects"."revision" > 0),
	CONSTRAINT "projects_access_valid" CHECK("projects"."access" in ('workspace', 'restricted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_workspace_key_unique` ON `projects` (`workspace_id`,`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_workspace_slug_unique` ON `projects` (`workspace_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_workspace_id_unique` ON `projects` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_workspace_folder_position_unique` ON `projects` (`workspace_id`,coalesce("folder_id", ''),`position`) WHERE "projects"."archived_at" is null and "projects"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `projects_workspace_state_idx` ON `projects` (`workspace_id`,`deleted_at`,`archived_at`);
