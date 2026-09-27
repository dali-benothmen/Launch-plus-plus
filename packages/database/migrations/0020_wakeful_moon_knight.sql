CREATE TABLE `organization_plugins` (
	`organization_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`plugin_package_id` text NOT NULL,
	`accepted_permissions_json` text NOT NULL,
	`enabled_by_user_id` text NOT NULL,
	`enabled_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `plugin_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_package_id`) REFERENCES `plugin_packages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`enabled_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "organization_plugins_plugin_id_not_blank" CHECK(length(trim("organization_plugins"."plugin_id")) > 0)
);
--> statement-breakpoint
CREATE INDEX `organization_plugins_package_idx` ON `organization_plugins` (`plugin_package_id`);--> statement-breakpoint
CREATE TABLE `plugin_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`version` text NOT NULL,
	`package_hash` text NOT NULL,
	`manifest_json` text NOT NULL,
	`integrity_json` text NOT NULL,
	`provenance_kind` text NOT NULL,
	`source_file_name` text NOT NULL,
	`archive_size_bytes` integer NOT NULL,
	`uploaded_by_user_id` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`installation_id`) REFERENCES `installations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "plugin_packages_plugin_id_not_blank" CHECK(length(trim("plugin_packages"."plugin_id")) > 0),
	CONSTRAINT "plugin_packages_version_not_blank" CHECK(length(trim("plugin_packages"."version")) > 0),
	CONSTRAINT "plugin_packages_hash_valid" CHECK(length("plugin_packages"."package_hash") = 64),
	CONSTRAINT "plugin_packages_archive_size_positive" CHECK("plugin_packages"."archive_size_bytes" > 0),
	CONSTRAINT "plugin_packages_provenance_valid" CHECK("plugin_packages"."provenance_kind" = 'unsigned-local')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_packages_installation_identity_unique` ON `plugin_packages` (`installation_id`,`plugin_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_packages_installation_hash_unique` ON `plugin_packages` (`installation_id`,`package_hash`);--> statement-breakpoint
CREATE INDEX `plugin_packages_installation_uploaded_idx` ON `plugin_packages` (`installation_id`,`uploaded_at`);