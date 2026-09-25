PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `task_divisions`;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`number` integer NOT NULL,
	`parent_task_id` text,
	`status_id` text NOT NULL,
	`team_id` text,
	`title` text NOT NULL,
	`description_markdown` text DEFAULT '' NOT NULL,
	`attachment_count` integer DEFAULT 0 NOT NULL,
	`due_date` text,
	`priority` text DEFAULT 'medium' NOT NULL,
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
	FOREIGN KEY (`organization_id`,`team_id`) REFERENCES `teams`(`organization_id`,`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organization_id`,`project_id`,`status_id`) REFERENCES `project_statuses`(`organization_id`,`project_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "tasks_number_positive" CHECK("__new_tasks"."number" > 0),
	CONSTRAINT "tasks_title_not_blank" CHECK(length(trim("__new_tasks"."title")) > 0),
	CONSTRAINT "tasks_position_valid" CHECK("__new_tasks"."position" >= 0),
	CONSTRAINT "tasks_attachment_count_valid" CHECK("__new_tasks"."attachment_count" >= 0 and "__new_tasks"."attachment_count" <= 100),
	CONSTRAINT "tasks_revision_positive" CHECK("__new_tasks"."revision" > 0),
	CONSTRAINT "tasks_priority_valid" CHECK("__new_tasks"."priority" in ('low', 'medium', 'high')),
	CONSTRAINT "tasks_due_date_valid" CHECK("__new_tasks"."due_date" is null or "__new_tasks"."due_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "tasks_parent_not_self" CHECK("__new_tasks"."parent_task_id" is null or "__new_tasks"."parent_task_id" <> "__new_tasks"."id")
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "organization_id", "project_id", "number", "parent_task_id", "status_id", "team_id", "title", "description_markdown", "attachment_count", "due_date", "priority", "position", "created_by_user_id", "updated_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision") SELECT "id", "organization_id", "project_id", "number", "parent_task_id", "status_id", "team_id", "title", "description_markdown", "attachment_count", "due_date", "priority", "position", "created_by_user_id", "updated_by_user_id", "created_at", "updated_at", "archived_at", "deleted_at", "revision" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_number_unique` ON `tasks` (`project_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_organization_id_unique` ON `tasks` (`organization_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_scope_position_unique` ON `tasks` (`project_id`,`status_id`,`coalesce("parent_task_id"`,` '')`,`position`) WHERE "tasks"."archived_at" is null and "tasks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `tasks_project_status_position_idx` ON `tasks` (`project_id`,`status_id`,`parent_task_id`,`position`);--> statement-breakpoint
CREATE INDEX `tasks_project_updated_idx` ON `tasks` (`project_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `tasks_parent_idx` ON `tasks` (`parent_task_id`,`archived_at`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`organization_id`,`due_date`);