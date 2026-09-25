CREATE TABLE `task_comment_reactions` (
	`comment_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`comment_id`, `user_id`, `emoji`),
	FOREIGN KEY (`comment_id`) REFERENCES `task_comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`user_id`) REFERENCES `organization_members`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "task_comment_reactions_emoji_not_blank" CHECK(length(trim("task_comment_reactions"."emoji")) > 0)
);
--> statement-breakpoint
CREATE INDEX `task_comment_reactions_comment_time_idx` ON `task_comment_reactions` (`comment_id`,`created_at`);