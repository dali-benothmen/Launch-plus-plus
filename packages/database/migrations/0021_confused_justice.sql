CREATE TABLE `project_plugins` (
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`plugin_package_id` text NOT NULL,
	`enabled_by_user_id` text NOT NULL,
	`enabled_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `plugin_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_package_id`) REFERENCES `plugin_packages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`enabled_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`,`project_id`) REFERENCES `projects`(`organization_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "project_plugins_plugin_id_not_blank" CHECK(length(trim("project_plugins"."plugin_id")) > 0)
);
--> statement-breakpoint
CREATE INDEX `project_plugins_organization_project_idx` ON `project_plugins` (`organization_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `project_plugins_package_idx` ON `project_plugins` (`plugin_package_id`);