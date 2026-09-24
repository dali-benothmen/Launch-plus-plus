ALTER TABLE `task_attachments` ADD `comment_id` text;--> statement-breakpoint
CREATE INDEX `task_attachments_comment_time_idx` ON `task_attachments` (`comment_id`,`created_at`);