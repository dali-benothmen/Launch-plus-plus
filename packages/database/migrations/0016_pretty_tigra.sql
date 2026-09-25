CREATE TABLE `task_divisions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`name` text NOT NULL,
	`comparison_key` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "task_divisions_name_not_blank" CHECK(length(trim("task_divisions"."name")) > 0),
	CONSTRAINT "task_divisions_position_valid" CHECK("task_divisions"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_divisions_task_name_unique` ON `task_divisions` (`task_id`,`comparison_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_divisions_task_position_unique` ON `task_divisions` (`task_id`,`position`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `division_id` text REFERENCES task_divisions(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `tasks_division_idx` ON `tasks` (`division_id`,`position`);