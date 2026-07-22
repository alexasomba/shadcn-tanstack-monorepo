CREATE TABLE `subscription` (
	`id` text PRIMARY KEY,
	`plan` text NOT NULL,
	`reference_id` text NOT NULL,
	`paystack_customer_code` text,
	`paystack_subscription_code` text UNIQUE,
	`paystack_transaction_reference` text,
	`paystack_authorization_code` text,
	`paystack_email_token` text,
	`status` text DEFAULT 'incomplete',
	`period_start` integer,
	`period_end` integer,
	`trial_start` integer,
	`trial_end` integer,
	`cancel_at_period_end` integer DEFAULT false,
	`group_id` text,
	`seats` integer,
	`pending_plan` text
);
--> statement-breakpoint
ALTER TABLE `todos` ADD `organization_id` text NOT NULL REFERENCES organization(id) ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX `todos_organization_idx` ON `todos` (`organization_id`);--> statement-breakpoint
CREATE INDEX `subscription_plan_idx` ON `subscription` (`plan`);--> statement-breakpoint
CREATE INDEX `subscription_referenceId_idx` ON `subscription` (`reference_id`);--> statement-breakpoint
CREATE INDEX `subscription_paystackCustomerCode_idx` ON `subscription` (`paystack_customer_code`);--> statement-breakpoint
CREATE INDEX `subscription_paystackTransactionReference_idx` ON `subscription` (`paystack_transaction_reference`);