CREATE TABLE `organization_registration_commands` (
	`installation_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`state` text NOT NULL,
	`result_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`installation_id`, `idempotency_key`),
	FOREIGN KEY (`installation_id`) REFERENCES `installations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "organization_registration_commands_state_valid" CHECK("organization_registration_commands"."state" in ('pending', 'completed')),
	CONSTRAINT "organization_registration_commands_result_complete" CHECK(("organization_registration_commands"."state" = 'pending' and "organization_registration_commands"."result_json" is null)
          or ("organization_registration_commands"."state" = 'completed' and "organization_registration_commands"."result_json" is not null))
);
--> statement-breakpoint
CREATE INDEX `organization_registration_commands_expiry_idx` ON `organization_registration_commands` (`expires_at`);