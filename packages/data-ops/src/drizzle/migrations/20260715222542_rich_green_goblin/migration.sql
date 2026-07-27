ALTER TABLE `user` ADD `username` text;--> statement-breakpoint
ALTER TABLE `user` ADD `display_username` text;--> statement-breakpoint
ALTER TABLE `user` ADD `phone_number` text;--> statement-breakpoint
ALTER TABLE `user` ADD `phone_number_verified` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`two_factor_enabled` integer DEFAULT false,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`username` text UNIQUE,
	`display_username` text,
	`phone_number` text UNIQUE,
	`phone_number_verified` integer,
	`paystack_customer_code` text
);
--> statement-breakpoint
INSERT INTO `__new_user`(`id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`, `two_factor_enabled`, `role`, `banned`, `ban_reason`, `ban_expires`, `paystack_customer_code`) SELECT `id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`, `two_factor_enabled`, `role`, `banned`, `ban_reason`, `ban_expires`, `paystack_customer_code` FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `user_paystackCustomerCode_idx` ON `user` (`paystack_customer_code`);