CREATE TABLE `installation_plugins` (
	`installation_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`plugin_package_id` text NOT NULL,
	`accepted_permissions_json` text NOT NULL,
	`enabled_by_user_id` text NOT NULL,
	`enabled_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`installation_id`, `plugin_id`),
	FOREIGN KEY (`installation_id`) REFERENCES `installations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_package_id`) REFERENCES `plugin_packages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`enabled_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "installation_plugins_plugin_id_not_blank" CHECK(length(trim("installation_plugins"."plugin_id")) > 0)
);
--> statement-breakpoint
CREATE INDEX `installation_plugins_package_idx` ON `installation_plugins` (`plugin_package_id`);--> statement-breakpoint
INSERT INTO `installation_plugins` (
	`installation_id`, `plugin_id`, `plugin_package_id`, `accepted_permissions_json`,
	`enabled_by_user_id`, `enabled_at`, `updated_at`
)
SELECT
	package.`installation_id`, enabled.`plugin_id`, enabled.`plugin_package_id`,
	enabled.`accepted_permissions_json`, enabled.`enabled_by_user_id`,
	enabled.`enabled_at`, enabled.`updated_at`
FROM `organization_plugins` enabled
INNER JOIN `plugin_packages` package ON package.`id` = enabled.`plugin_package_id`
WHERE NOT EXISTS (
	SELECT 1
	FROM `organization_plugins` newer
	INNER JOIN `plugin_packages` newer_package ON newer_package.`id` = newer.`plugin_package_id`
	WHERE newer_package.`installation_id` = package.`installation_id`
		AND newer.`plugin_id` = enabled.`plugin_id`
		AND (
			newer.`updated_at` > enabled.`updated_at`
			OR (newer.`updated_at` = enabled.`updated_at` AND newer.`organization_id` < enabled.`organization_id`)
		)
);--> statement-breakpoint
DROP TABLE `organization_plugins`;--> statement-breakpoint
DROP TABLE `project_plugins`;
