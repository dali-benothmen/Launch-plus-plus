CREATE TABLE `audit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`workspace_id` text,
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
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "audit_entries_outcome_valid" CHECK("audit_entries"."outcome" in ('succeeded', 'denied', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `audit_entries_installation_time_idx` ON `audit_entries` (`installation_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_entries_workspace_time_idx` ON `audit_entries` (`workspace_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`avatar_asset_id` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`current_workspace_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`state` text NOT NULL,
	`joined_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `user_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workspace_members_role_valid" CHECK("workspace_members"."role" in ('owner', 'admin', 'member')),
	CONSTRAINT "workspace_members_state_valid" CHECK("workspace_members"."state" in ('active', 'suspended'))
);
--> statement-breakpoint
CREATE INDEX `workspace_members_user_state_idx` ON `workspace_members` (`user_id`,`state`,`workspace_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
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
	CONSTRAINT "workspaces_name_not_blank" CHECK(length(trim("workspaces"."name")) > 0),
	CONSTRAINT "workspaces_revision_positive" CHECK("workspaces"."revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_installation_slug_unique` ON `workspaces` (`installation_id`,`slug`);--> statement-breakpoint
CREATE INDEX `workspaces_installation_updated_idx` ON `workspaces` (`installation_id`,`updated_at`);