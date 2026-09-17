CREATE TABLE `installations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`topic` text NOT NULL,
	`payload_json` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`available_at` integer NOT NULL,
	`correlation_id` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`leased_until` integer,
	`processed_at` integer,
	FOREIGN KEY (`installation_id`) REFERENCES `installations`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `outbox_pending_idx` ON `outbox_messages` (`processed_at`,`available_at`);--> statement-breakpoint
CREATE INDEX `outbox_installation_idx` ON `outbox_messages` (`installation_id`,`occurred_at`);