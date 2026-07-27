CREATE TABLE `apikey` (
	`id` text PRIMARY KEY,
	`config_id` text DEFAULT 'default' NOT NULL,
	`name` text,
	`start` text,
	`reference_id` text NOT NULL,
	`prefix` text,
	`key` text NOT NULL,
	`refill_interval` integer,
	`refill_amount` integer,
	`last_refill_at` integer,
	`enabled` integer DEFAULT true,
	`rate_limit_enabled` integer DEFAULT true,
	`rate_limit_time_window` integer DEFAULT 86400000,
	`rate_limit_max` integer DEFAULT 10,
	`request_count` integer DEFAULT 0,
	`remaining` integer,
	`last_request` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`permissions` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `paystack_plan` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`interval` text NOT NULL,
	`plan_code` text NOT NULL UNIQUE,
	`paystack_id` text NOT NULL UNIQUE,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `paystack_product` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`currency` text NOT NULL,
	`quantity` integer DEFAULT 0,
	`unlimited` integer DEFAULT true,
	`paystack_id` text UNIQUE,
	`slug` text NOT NULL UNIQUE,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `paystack_transaction` (
	`id` text PRIMARY KEY,
	`reference` text NOT NULL UNIQUE,
	`paystack_id` text,
	`reference_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`plan` text,
	`product` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user` ADD `paystack_customer_code` text;--> statement-breakpoint
CREATE INDEX `apikey_configId_idx` ON `apikey` (`config_id`);--> statement-breakpoint
CREATE INDEX `apikey_referenceId_idx` ON `apikey` (`reference_id`);--> statement-breakpoint
CREATE INDEX `apikey_key_idx` ON `apikey` (`key`);--> statement-breakpoint
CREATE INDEX `paystackTransaction_referenceId_idx` ON `paystack_transaction` (`reference_id`);--> statement-breakpoint
CREATE INDEX `paystackTransaction_userId_idx` ON `paystack_transaction` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_paystackCustomerCode_idx` ON `user` (`paystack_customer_code`);