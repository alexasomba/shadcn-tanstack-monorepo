ALTER TABLE `organization` ADD `paystack_customer_code` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `email` text;--> statement-breakpoint
CREATE INDEX `organization_paystackCustomerCode_idx` ON `organization` (`paystack_customer_code`);