CREATE TABLE `activity_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`task_id` text,
	`actor_user_id` text,
	`operation` text NOT NULL,
	`metadata_json` text NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_entries_workspace_time_idx` ON `activity_entries` (`workspace_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `activity_entries_project_time_idx` ON `activity_entries` (`project_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `activity_entries_task_time_idx` ON `activity_entries` (`task_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `invalidation_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outbox_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`resource_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`topic` text NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invalidation_events_outbox_id_unique` ON `invalidation_events` (`outbox_id`);--> statement-breakpoint
CREATE INDEX `invalidation_events_workspace_sequence_idx` ON `invalidation_events` (`workspace_id`,`sequence`);--> statement-breakpoint
ALTER TABLE `outbox_messages` ADD `lease_owner` text;--> statement-breakpoint
CREATE VIRTUAL TABLE `search_documents` USING fts5(
	`resource_id` UNINDEXED,
	`resource_type` UNINDEXED,
	`workspace_id` UNINDEXED,
	`project_id` UNINDEXED,
	`title`,
	`subtitle`,
	`body`,
	tokenize='unicode61 remove_diacritics 2'
);
