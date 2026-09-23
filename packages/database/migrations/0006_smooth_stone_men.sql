CREATE TABLE `idempotency_records` (
	`actor_user_id` text NOT NULL,
	`scope_key` text NOT NULL,
	`operation` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`state` text NOT NULL,
	`response_status` integer,
	`response_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`actor_user_id`, `scope_key`, `operation`, `idempotency_key`),
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "idempotency_records_state_valid" CHECK("idempotency_records"."state" in ('pending', 'completed')),
	CONSTRAINT "idempotency_records_response_complete" CHECK(("idempotency_records"."state" = 'pending' and "idempotency_records"."response_status" is null and "idempotency_records"."response_json" is null)
          or ("idempotency_records"."state" = 'completed' and "idempotency_records"."response_status" is not null and "idempotency_records"."response_json" is not null))
);
--> statement-breakpoint
CREATE INDEX `idempotency_records_expiry_idx` ON `idempotency_records` (`expires_at`);