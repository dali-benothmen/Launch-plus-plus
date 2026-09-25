CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "teams_name_not_blank" CHECK(length(trim("teams"."name")) > 0),
	CONSTRAINT "teams_revision_positive" CHECK("teams"."revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_organization_name_unique` ON `teams` (`organization_id`,lower("name"));--> statement-breakpoint
CREATE INDEX `teams_organization_created_idx` ON `teams` (`organization_id`,`created_at`);