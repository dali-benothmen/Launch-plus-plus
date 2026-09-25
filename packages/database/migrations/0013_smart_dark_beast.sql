CREATE TABLE `task_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`content` blob NOT NULL,
	`uploaded_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`task_id`) REFERENCES `tasks`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`uploaded_by_user_id`) REFERENCES `organization_members`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_attachments_name_not_blank" CHECK(length(trim("task_attachments"."name")) > 0),
	CONSTRAINT "task_attachments_content_type_not_blank" CHECK(length(trim("task_attachments"."content_type")) > 0),
	CONSTRAINT "task_attachments_size_valid" CHECK("task_attachments"."size" > 0 and "task_attachments"."size" <= 5242880)
);
--> statement-breakpoint
CREATE INDEX `task_attachments_task_time_idx` ON `task_attachments` (`task_id`,`created_at`);
--> statement-breakpoint
UPDATE `tasks` SET `attachment_count` = 0;
