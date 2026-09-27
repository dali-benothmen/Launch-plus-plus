CREATE TABLE `plugin_field_values` (
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value_type` text NOT NULL,
	`number_value` real,
	`text_value` text,
	`updated_by_user_id` text NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`task_id`, `plugin_id`, `field_id`),
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`task_id`) REFERENCES `tasks`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "plugin_field_values_plugin_id_not_blank" CHECK(length(trim("plugin_field_values"."plugin_id")) > 0),
	CONSTRAINT "plugin_field_values_field_id_not_blank" CHECK(length(trim("plugin_field_values"."field_id")) > 0),
	CONSTRAINT "plugin_field_values_revision_positive" CHECK("plugin_field_values"."revision" > 0),
	CONSTRAINT "plugin_field_values_value_valid" CHECK(("plugin_field_values"."value_type" = 'number' and "plugin_field_values"."number_value" is not null and "plugin_field_values"."text_value" is null)
          or ("plugin_field_values"."value_type" = 'text' and "plugin_field_values"."text_value" is not null and "plugin_field_values"."number_value" is null))
);
--> statement-breakpoint
CREATE INDEX `plugin_field_values_project_field_idx` ON `plugin_field_values` (`organization_id`,`project_id`,`plugin_id`,`field_id`);--> statement-breakpoint
CREATE INDEX `plugin_field_values_number_idx` ON `plugin_field_values` (`organization_id`,`project_id`,`plugin_id`,`field_id`,`number_value`);