CREATE TABLE `task_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`body_markdown` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`project_id`) REFERENCES `projects`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`task_id`) REFERENCES `tasks`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`author_user_id`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_comments_body_not_blank" CHECK(length(trim("task_comments"."body_markdown")) > 0),
	CONSTRAINT "task_comments_revision_positive" CHECK("task_comments"."revision" > 0)
);
--> statement-breakpoint
CREATE INDEX `task_comments_task_time_idx` ON `task_comments` (`task_id`,`created_at`);