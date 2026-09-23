CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`comparison_key` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`project_id`) REFERENCES `projects`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "labels_name_not_blank" CHECK(length(trim("labels"."name")) > 0),
	CONSTRAINT "labels_comparison_key_not_blank" CHECK(length("labels"."comparison_key") > 0),
	CONSTRAINT "labels_color_not_blank" CHECK(length(trim("labels"."color")) > 0),
	CONSTRAINT "labels_revision_positive" CHECK("labels"."revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_workspace_id_unique` ON `labels` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `labels_scope_name_unique` ON `labels` (`workspace_id`,coalesce("project_id", ''),`comparison_key`);--> statement-breakpoint
CREATE INDEX `labels_workspace_project_state_idx` ON `labels` (`workspace_id`,`project_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `task_assignees` (
	`workspace_id` text NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`assigned_by_user_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	PRIMARY KEY(`task_id`, `user_id`),
	FOREIGN KEY (`assigned_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`task_id`) REFERENCES `tasks`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`user_id`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_assignees_user_idx` ON `task_assignees` (`workspace_id`,`user_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `task_labels` (
	`workspace_id` text NOT NULL,
	`task_id` text NOT NULL,
	`label_id` text NOT NULL,
	`applied_by_user_id` text NOT NULL,
	`applied_at` integer NOT NULL,
	PRIMARY KEY(`task_id`, `label_id`),
	FOREIGN KEY (`applied_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`task_id`) REFERENCES `tasks`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`label_id`) REFERENCES `labels`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_labels_label_idx` ON `task_labels` (`workspace_id`,`label_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
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
	FOREIGN KEY (`workspace_id`,`project_id`) REFERENCES `projects`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`project_id`,`status_id`) REFERENCES `project_statuses`(`workspace_id`,`project_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "tasks_number_positive" CHECK("tasks"."number" > 0),
	CONSTRAINT "tasks_title_not_blank" CHECK(length(trim("tasks"."title")) > 0),
	CONSTRAINT "tasks_position_valid" CHECK("tasks"."position" >= 0),
	CONSTRAINT "tasks_revision_positive" CHECK("tasks"."revision" > 0),
	CONSTRAINT "tasks_due_date_valid" CHECK("tasks"."due_date" is null or "tasks"."due_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "tasks_parent_not_self" CHECK("tasks"."parent_task_id" is null or "tasks"."parent_task_id" <> "tasks"."id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_number_unique` ON `tasks` (`project_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_workspace_id_unique` ON `tasks` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_scope_position_unique` ON `tasks` (`project_id`,`status_id`,coalesce("parent_task_id", ''),`position`) WHERE "tasks"."archived_at" is null and "tasks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `tasks_project_status_position_idx` ON `tasks` (`project_id`,`status_id`,`parent_task_id`,`position`);--> statement-breakpoint
CREATE INDEX `tasks_project_updated_idx` ON `tasks` (`project_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `tasks_parent_idx` ON `tasks` (`parent_task_id`,`archived_at`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`workspace_id`,`due_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_statuses_workspace_project_id_unique` ON `project_statuses` (`workspace_id`,`project_id`,`id`);
