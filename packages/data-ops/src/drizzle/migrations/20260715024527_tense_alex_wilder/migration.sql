CREATE TABLE `customers` (
	`id` text PRIMARY KEY,
	`source_system` text DEFAULT 'internal',
	`source_id` text,
	`source_updated_at` integer,
	`last_synced_at` integer,
	`sync_hash` text,
	`source_snapshot` text,
	`party_id` text,
	`user_id` text,
	`organization_id` text,
	`email` text NOT NULL UNIQUE,
	`paystack_customer_code` text,
	`name` text,
	`first_name` text,
	`last_name` text,
	`onesignal_id` text,
	`is_guest` integer DEFAULT true NOT NULL,
	`metadata` text,
	`abandoned_cart_count` integer DEFAULT 0 NOT NULL,
	`last_purchase_at` integer,
	`phone` text,
	`address_street` text,
	`address_street2` text,
	`address_city` text,
	`address_state` text,
	`address_zip` text,
	`address_country` text,
	`wallet_balance` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_customers_party_id_parties_id_fk` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_customers_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_customers_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL,
	CONSTRAINT "customers_abandoned_cart_count_nonnegative_chk" CHECK("abandoned_cart_count" >= 0),
	CONSTRAINT "customers_wallet_balance_nonnegative_chk" CHECK("wallet_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY,
	`source_system` text DEFAULT 'internal',
	`source_id` text,
	`source_updated_at` integer,
	`last_synced_at` integer,
	`sync_hash` text,
	`source_snapshot` text,
	`customer_id` text NOT NULL,
	`purchase_scope` text DEFAULT 'personal' NOT NULL,
	`organization_id` text,
	`order_number` text,
	`external_status` text,
	`status` text DEFAULT 'draft',
	`total` integer NOT NULL,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`coupon_code` text,
	`currency` text DEFAULT 'NGN',
	`payment_status` text DEFAULT 'unpaid',
	`payment_reference` text,
	`shipping_method` text,
	`shipping_cost` integer DEFAULT 0 NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`billing_first_name` text,
	`billing_last_name` text,
	`billing_company` text,
	`billing_email` text,
	`billing_phone` text,
	`billing_address_street` text,
	`billing_address_street2` text,
	`billing_address_city` text,
	`billing_address_state` text,
	`billing_address_zip` text,
	`billing_address_country` text,
	`shipping_first_name` text,
	`shipping_last_name` text,
	`shipping_company` text,
	`shipping_address_street` text,
	`shipping_address_street2` text,
	`shipping_address_city` text,
	`shipping_address_state` text,
	`shipping_address_zip` text,
	`shipping_address_country` text,
	`customer_phone` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	CONSTRAINT `fk_orders_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `parties` (
	`id` text PRIMARY KEY,
	`user_id` text,
	`organization_id` text,
	`email` text NOT NULL UNIQUE,
	`name` text,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`kind` text DEFAULT 'customer' NOT NULL,
	`source` text DEFAULT 'internal' NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_parties_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_parties_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY,
	`source_system` text DEFAULT 'internal',
	`source_id` text,
	`source_updated_at` integer,
	`last_synced_at` integer,
	`sync_hash` text,
	`source_snapshot` text,
	`order_id` text,
	`customer_id` text,
	`party_id` text,
	`user_id` text,
	`provider` text DEFAULT 'paystack' NOT NULL,
	`provider_reference` text NOT NULL UNIQUE,
	`transaction_id` text,
	`payment_method` text,
	`payment_method_title` text,
	`auth_transaction_id` text,
	`kind` text DEFAULT 'payment' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`amount_total` integer NOT NULL,
	`amount_fee` integer DEFAULT 0 NOT NULL,
	`amount_tax` integer DEFAULT 0 NOT NULL,
	`amount_shipping` integer DEFAULT 0 NOT NULL,
	`amount_discount` integer DEFAULT 0 NOT NULL,
	`paid_at` integer,
	`completed_at` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_payments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_payments_party_id_parties_id_fk` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_payments_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "payments_amount_total_nonnegative_chk" CHECK("amount_total" >= 0)
);
--> statement-breakpoint
CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_admin_audit_logs_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `affiliate_profiles` (
	`id` text PRIMARY KEY,
	`user_id` text,
	`customer_id` text,
	`code` text NOT NULL UNIQUE,
	`status` text DEFAULT 'pending',
	`payout_email` text,
	`rate_type` text DEFAULT 'percentage',
	`rate_value` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_affiliate_profiles_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_affiliate_profiles_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
	CONSTRAINT "affiliate_profiles_rate_value_nonnegative_chk" CHECK("rate_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE `campaign_deliveries` (
	`id` text PRIMARY KEY,
	`campaign_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`customer_id` text,
	`status` text DEFAULT 'queued',
	`sent_at` integer,
	`opened_at` integer,
	`clicked_at` integer,
	`failed_at` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_campaign_deliveries_campaign_id_marketing_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `marketing_campaigns`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_campaign_deliveries_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_campaign_deliveries_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_companies` (
	`id` text PRIMARY KEY,
	`organization_id` text,
	`name` text NOT NULL,
	`primary_contact_id` text,
	`domain` text,
	`website` text,
	`email` text,
	`phone` text,
	`industry` text,
	`external_id` text,
	`external_source` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_companies_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_companies_primary_contact_id_crm_contacts_id_fk` FOREIGN KEY (`primary_contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_contacts` (
	`id` text PRIMARY KEY,
	`party_id` text,
	`user_id` text,
	`company_id` text,
	`first_name` text,
	`last_name` text,
	`email` text NOT NULL UNIQUE,
	`phone` text,
	`job_title` text,
	`company` text,
	`linkedin_url` text,
	`source` text,
	`status` text DEFAULT 'lead',
	`marketing_status` text DEFAULT 'subscribed',
	`marketing_subscribed_at` integer,
	`marketing_unsubscribed_at` integer,
	`last_marketing_engagement_at` integer,
	`metadata` text,
	`prefix` text,
	`last_contacted_at` integer,
	`external_id` text,
	`external_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_contacts_party_id_parties_id_fk` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_contacts_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_contacts_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_contacts_companies` (
	`id` text PRIMARY KEY,
	`contact_id` text NOT NULL,
	`company_id` text NOT NULL,
	`association_type_id` text,
	`is_primary` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_contacts_companies_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_contacts_companies_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_deals` (
	`id` text PRIMARY KEY,
	`contact_id` text,
	`order_id` text,
	`title` text NOT NULL,
	`description` text,
	`value` integer NOT NULL,
	`currency` text DEFAULT 'NGN',
	`pipeline_id` text,
	`stage` text DEFAULT 'discovery',
	`priority` text DEFAULT 'medium',
	`assigned_to` text,
	`expected_close_date` integer,
	`expires_at` integer,
	`external_id` text,
	`external_source` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_deals_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_deals_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_deals_assigned_to_user_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "crm_deals_value_nonnegative_chk" CHECK("value" >= 0)
);
--> statement-breakpoint
CREATE TABLE `crm_deals_companies` (
	`id` text PRIMARY KEY,
	`deal_id` text NOT NULL,
	`company_id` text NOT NULL,
	`association_type_id` text,
	`is_primary` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_deals_companies_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_deals_companies_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_deals_contacts` (
	`id` text PRIMARY KEY,
	`deal_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`association_type_id` text,
	`is_primary` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_deals_contacts_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_deals_contacts_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_fields` (
	`id` text PRIMARY KEY,
	`object_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'text' NOT NULL,
	`storage_kind` text DEFAULT 'metadata_json' NOT NULL,
	`source_column` text,
	`relation_object_key` text,
	`relation_type` text,
	`options` text,
	`validation` text,
	`default_value` text,
	`is_system` integer DEFAULT false NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`is_readonly` integer DEFAULT false NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`is_filterable` integer DEFAULT true NOT NULL,
	`is_sortable` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_fields_object_id_crm_objects_id_fk` FOREIGN KEY (`object_id`) REFERENCES `crm_objects`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_invoices` (
	`id` text PRIMARY KEY,
	`owner_id` text,
	`contact_id` text,
	`company_id` text,
	`order_id` text,
	`quote_id` text,
	`reference` text,
	`status` text DEFAULT 'draft',
	`currency` text DEFAULT 'NGN',
	`amount_net` integer DEFAULT 0,
	`amount_tax` integer DEFAULT 0,
	`amount_shipping` integer DEFAULT 0,
	`amount_shipping_tax` integer DEFAULT 0,
	`amount_discount` integer DEFAULT 0,
	`discount_type` text,
	`amount_total` integer NOT NULL,
	`hash` text,
	`hash_viewed_at` integer,
	`portal_viewed_at` integer,
	`hash_viewed_count` integer DEFAULT 0 NOT NULL,
	`portal_viewed_count` integer DEFAULT 0 NOT NULL,
	`addressed_from` text,
	`addressed_to` text,
	`issue_date` integer,
	`due_date` integer,
	`paid_at` integer,
	`external_id` text,
	`external_source` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_invoices_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_invoices_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_invoices_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_invoices_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_invoices_quote_id_crm_quotes_id_fk` FOREIGN KEY (`quote_id`) REFERENCES `crm_quotes`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_line_items` (
	`id` text PRIMARY KEY,
	`deal_id` text NOT NULL,
	`product_id` text,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` integer NOT NULL,
	`amount` integer NOT NULL,
	`discount` integer DEFAULT 0,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`external_id` text,
	`external_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_line_items_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_line_items_product_id_crm_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `crm_products`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_notes` (
	`id` text PRIMARY KEY,
	`contact_id` text,
	`company_id` text,
	`deal_id` text,
	`author_user_id` text,
	`body` text NOT NULL,
	`external_id` text,
	`external_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_notes_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_notes_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_notes_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_notes_author_user_id_user_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_objects` (
	`id` text PRIMARY KEY,
	`key` text NOT NULL,
	`table_name` text,
	`label_singular` text NOT NULL,
	`label_plural` text NOT NULL,
	`description` text,
	`source_type` text DEFAULT 'system' NOT NULL,
	`route_path` text,
	`icon_key` text,
	`color` text,
	`primary_label_field_key` text,
	`primary_image_field_key` text,
	`default_view_type` text DEFAULT 'table' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_audit_enabled` integer DEFAULT true NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`external_id` text,
	`external_source` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm_products` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`sku` text UNIQUE,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`recurring_billing_frequency` text,
	`external_id` text,
	`external_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm_quotes` (
	`id` text PRIMARY KEY,
	`owner_id` text,
	`contact_id` text,
	`deal_id` text,
	`title` text,
	`reference` text,
	`status` text DEFAULT 'draft',
	`currency` text DEFAULT 'NGN',
	`value` integer NOT NULL,
	`hash` text,
	`last_viewed_at` integer,
	`viewed_count` integer DEFAULT 0 NOT NULL,
	`accepted_at` integer,
	`signed_at` integer,
	`signed_ip` text,
	`external_id` text,
	`external_source` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_quotes_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_quotes_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_quotes_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_record_activity` (
	`id` text PRIMARY KEY,
	`object_key` text NOT NULL,
	`record_id` text NOT NULL,
	`activity_type` text DEFAULT 'system' NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`payload` text,
	`actor_user_id` text,
	`task_id` text,
	`note_id` text,
	`ticket_id` text,
	`deal_id` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_record_activity_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_record_activity_task_id_crm_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `crm_tasks`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_record_activity_note_id_crm_notes_id_fk` FOREIGN KEY (`note_id`) REFERENCES `crm_notes`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_record_activity_ticket_id_crm_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `crm_tickets`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_record_activity_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_record_layouts` (
	`id` text PRIMARY KEY,
	`object_id` text NOT NULL,
	`owner_user_id` text,
	`name` text NOT NULL,
	`visibility` text DEFAULT 'workspace' NOT NULL,
	`config` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_record_layouts_object_id_crm_objects_id_fk` FOREIGN KEY (`object_id`) REFERENCES `crm_objects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_record_layouts_owner_user_id_user_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_record_layouts_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_record_layouts_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_segments` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL UNIQUE,
	`description` text,
	`filter_definition` text,
	`contact_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "crm_segments_contact_count_nonnegative_chk" CHECK("contact_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `crm_subscriptions` (
	`id` text PRIMARY KEY,
	`customer_id` text,
	`company_id` text,
	`contact_id` text,
	`product_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`billing_period` text NOT NULL,
	`billing_interval` integer DEFAULT 1 NOT NULL,
	`recurring_total` integer NOT NULL,
	`next_payment_date` integer NOT NULL,
	`end_date` integer,
	`external_id` text,
	`external_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_subscriptions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_subscriptions_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_subscriptions_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_subscriptions_product_id_crm_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `crm_products`(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` text PRIMARY KEY,
	`related_object_key` text NOT NULL,
	`related_record_id` text NOT NULL,
	`contact_id` text,
	`company_id` text,
	`deal_id` text,
	`ticket_id` text,
	`customer_id` text,
	`title` text NOT NULL,
	`body` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_at` integer,
	`completed_at` integer,
	`assigned_to` text,
	`created_by` text,
	`external_id` text,
	`external_source` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_tasks_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_tasks_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_tasks_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_tasks_ticket_id_crm_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `crm_tickets`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_tasks_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_tasks_assigned_to_user_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_tasks_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_tickets` (
	`id` text PRIMARY KEY,
	`contact_id` text,
	`customer_id` text,
	`subject` text NOT NULL,
	`description` text,
	`pipeline_id` text,
	`status` text DEFAULT 'open',
	`priority` text DEFAULT 'medium',
	`assigned_to` text,
	`external_id` text,
	`external_source` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_tickets_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_tickets_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_tickets_assigned_to_user_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `crm_tickets_companies` (
	`id` text PRIMARY KEY,
	`ticket_id` text NOT NULL,
	`company_id` text NOT NULL,
	`association_type_id` text,
	`is_primary` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_tickets_companies_ticket_id_crm_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `crm_tickets`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_tickets_companies_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_tickets_contacts` (
	`id` text PRIMARY KEY,
	`ticket_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`association_type_id` text,
	`is_primary` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_tickets_contacts_ticket_id_crm_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `crm_tickets`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_tickets_contacts_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_view_favorites` (
	`id` text PRIMARY KEY,
	`view_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_view_favorites_view_id_crm_views_id_fk` FOREIGN KEY (`view_id`) REFERENCES `crm_views`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_view_favorites_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `crm_views` (
	`id` text PRIMARY KEY,
	`object_id` text NOT NULL,
	`owner_user_id` text,
	`name` text NOT NULL,
	`type` text DEFAULT 'table' NOT NULL,
	`visibility` text DEFAULT 'workspace' NOT NULL,
	`config` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_crm_views_object_id_crm_objects_id_fk` FOREIGN KEY (`object_id`) REFERENCES `crm_objects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_crm_views_owner_user_id_user_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_views_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_crm_views_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `customer_channel_subscriptions` (
	`id` text PRIMARY KEY,
	`contact_id` text,
	`customer_id` text,
	`user_id` text,
	`channel` text NOT NULL,
	`provider` text DEFAULT 'onesignal' NOT NULL,
	`provider_subscription_id` text,
	`provider_user_id` text,
	`external_id` text,
	`token_hash` text,
	`token_masked` text,
	`status` text DEFAULT 'unknown' NOT NULL,
	`source` text DEFAULT 'system' NOT NULL,
	`permission_state` text DEFAULT 'unknown' NOT NULL,
	`opted_in` integer,
	`subscribed_at` integer,
	`unsubscribed_at` integer,
	`cleaned_at` integer,
	`blocked_at` integer,
	`last_synced_at` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_customer_channel_subscriptions_contact_id_crm_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_customer_channel_subscriptions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_customer_channel_subscriptions_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `marketing_campaigns` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`preview_text` text,
	`from_name` text,
	`from_email` text,
	`channel_mode` text DEFAULT 'both',
	`push_target_mode` text DEFAULT 'auto',
	`email_target_mode` text DEFAULT 'auto',
	`status` text DEFAULT 'draft',
	`segment_id` text,
	`segment_definition` text,
	`content` text,
	`scheduled_at` integer,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_marketing_campaigns_segment_id_crm_segments_id_fk` FOREIGN KEY (`segment_id`) REFERENCES `crm_segments`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `not_found_events` (
	`id` text PRIMARY KEY,
	`path` text NOT NULL,
	`referer` text,
	`user_agent` text,
	`ip_hash` text,
	`hit_count` integer DEFAULT 1 NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_redirect_id` text,
	CONSTRAINT `fk_not_found_events_resolved_redirect_id_redirect_rules_id_fk` FOREIGN KEY (`resolved_redirect_id`) REFERENCES `redirect_rules`(`id`) ON DELETE SET NULL,
	CONSTRAINT "not_found_events_hit_count_positive_chk" CHECK("hit_count" >= 1)
);
--> statement-breakpoint
CREATE TABLE `notification_delivery_records` (
	`id` text PRIMARY KEY,
	`business_event_type` text NOT NULL,
	`business_event_id` text NOT NULL,
	`source_entity_type` text NOT NULL,
	`source_entity_id` text NOT NULL,
	`order_id` text,
	`customer_id` text,
	`support_ticket_id` text,
	`route` text NOT NULL,
	`recipient_type` text NOT NULL,
	`recipient_id` text NOT NULL,
	`recipient_label` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 4 NOT NULL,
	`first_attempt_at` integer,
	`last_attempt_at` integer,
	`next_retry_at` integer,
	`terminal_at` integer,
	`provider_message_id` text,
	`provider_response_summary` text,
	`provider_error_code` text,
	`failure_class` text,
	`template_version` text,
	`send_provenance` text,
	`last_error` text,
	`template_key` text,
	`metadata` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_notification_delivery_records_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_notification_delivery_records_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_notification_delivery_records_support_ticket_id_crm_tickets_id_fk` FOREIGN KEY (`support_ticket_id`) REFERENCES `crm_tickets`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `redirect_rules` (
	`id` text PRIMARY KEY,
	`source_path` text NOT NULL UNIQUE,
	`target_path` text NOT NULL,
	`status_code` integer DEFAULT 301 NOT NULL,
	`match_type` text DEFAULT 'exact',
	`is_active` integer DEFAULT true NOT NULL,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`last_hit_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "redirect_rules_hit_count_nonnegative_chk" CHECK("hit_count" >= 0),
	CONSTRAINT "redirect_rules_status_code_valid_chk" CHECK("status_code" IN (301, 302, 307, 308))
);
--> statement-breakpoint
CREATE TABLE `workflow_action_deliveries` (
	`id` text PRIMARY KEY,
	`workflow_run_id` text NOT NULL,
	`workflow_step_run_id` text,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`channel` text NOT NULL,
	`provider` text,
	`template_key` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider_message_id` text,
	`idempotency_key` text NOT NULL,
	`error_message` text,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_workflow_action_deliveries_workflow_run_id_workflow_runs_id_fk` FOREIGN KEY (`workflow_run_id`) REFERENCES `workflow_runs`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workflow_action_deliveries_workflow_step_run_id_workflow_step_runs_id_fk` FOREIGN KEY (`workflow_step_run_id`) REFERENCES `workflow_step_runs`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_definitions` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`workflow_type` text NOT NULL,
	`trigger_type` text NOT NULL,
	`trigger_config` text NOT NULL,
	`audience_config` text,
	`step_config` text NOT NULL,
	`goal_config` text,
	`suppression_config` text,
	`channel_config` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` text,
	`updated_by` text,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_workflow_definitions_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_workflow_definitions_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "workflow_definitions_version_positive_chk" CHECK("version" >= 1)
);
--> statement-breakpoint
CREATE TABLE `workflow_enrollments` (
	`id` text PRIMARY KEY,
	`workflow_definition_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`trigger_event_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`entered_at` integer NOT NULL,
	`exited_at` integer,
	`exit_reason` text,
	`current_run_id` text,
	`dedupe_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_workflow_enrollments_workflow_definition_id_workflow_definitions_id_fk` FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workflow_enrollments_trigger_event_id_workflow_trigger_events_id_fk` FOREIGN KEY (`trigger_event_id`) REFERENCES `workflow_trigger_events`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`id` text PRIMARY KEY,
	`workflow_definition_id` text NOT NULL,
	`workflow_enrollment_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`workflow_instance_key` text NOT NULL,
	`goal_type` text,
	`goal_status` text,
	`goal_achieved_at` integer,
	`goal_value` integer,
	`goal_metadata` text,
	`trigger_snapshot` text,
	`subject_snapshot` text,
	`failure_reason` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_workflow_runs_workflow_definition_id_workflow_definitions_id_fk` FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workflow_runs_workflow_enrollment_id_workflow_enrollments_id_fk` FOREIGN KEY (`workflow_enrollment_id`) REFERENCES `workflow_enrollments`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `workflow_step_runs` (
	`id` text PRIMARY KEY,
	`workflow_run_id` text NOT NULL,
	`step_key` text NOT NULL,
	`step_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input_snapshot` text,
	`output_snapshot` text,
	`failure_reason` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_workflow_step_runs_workflow_run_id_workflow_runs_id_fk` FOREIGN KEY (`workflow_run_id`) REFERENCES `workflow_runs`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `workflow_suppressions` (
	`id` text PRIMARY KEY,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`channel` text,
	`suppression_type` text NOT NULL,
	`scope_key` text NOT NULL,
	`active_until` integer,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_trigger_events` (
	`id` text PRIMARY KEY,
	`event_type` text NOT NULL,
	`source` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`customer_id` text,
	`order_id` text,
	`payload` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`dedupe_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_workflow_trigger_events_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_workflow_trigger_events_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_domains` (
	`id` text PRIMARY KEY,
	`organization_id` text NOT NULL,
	`hostname` text NOT NULL UNIQUE,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	CONSTRAINT `domains_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_domains`(`id`, `organization_id`, `hostname`, `status`, `created_at`) SELECT `id`, `organization_id`, `hostname`, `status`, `created_at` FROM `domains`;--> statement-breakpoint
DROP TABLE `domains`;--> statement-breakpoint
ALTER TABLE `__new_domains` RENAME TO `domains`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_referral_code` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL UNIQUE,
	`code` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `referral_code_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_referral_code`(`id`, `user_id`, `code`, `created_at`) SELECT `id`, `user_id`, `code`, `created_at` FROM `referral_code`;--> statement-breakpoint
DROP TABLE `referral_code`;--> statement-breakpoint
ALTER TABLE `__new_referral_code` RENAME TO `referral_code`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_referrals` (
	`id` text PRIMARY KEY,
	`referrer_user_id` text NOT NULL,
	`referred_user_id` text NOT NULL UNIQUE,
	`referral_code_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `referrals_referrer_user_id_user_id_fk` FOREIGN KEY (`referrer_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `referrals_referred_user_id_user_id_fk` FOREIGN KEY (`referred_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `referrals_referral_code_id_referral_code_id_fk` FOREIGN KEY (`referral_code_id`) REFERENCES `referral_code`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_referrals`(`id`, `referrer_user_id`, `referred_user_id`, `referral_code_id`, `created_at`) SELECT `id`, `referrer_user_id`, `referred_user_id`, `referral_code_id`, `created_at` FROM `referrals`;--> statement-breakpoint
DROP TABLE `referrals`;--> statement-breakpoint
ALTER TABLE `__new_referrals` RENAME TO `referrals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`active_organization_id` text,
	`impersonated_by` text,
	CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_session`(`id`, `expires_at`, `token`, `created_at`, `updated_at`, `ip_address`, `user_agent`, `user_id`, `active_organization_id`, `impersonated_by`) SELECT `id`, `expires_at`, `token`, `created_at`, `updated_at`, `ip_address`, `user_agent`, `user_id`, `active_organization_id`, `impersonated_by` FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
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
	`ban_expires` integer
);
--> statement-breakpoint
INSERT INTO `__new_user`(`id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`, `two_factor_enabled`, `role`, `banned`, `ban_reason`, `ban_expires`) SELECT `id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`, `two_factor_enabled`, `role`, `banned`, `ban_reason`, `ban_expires` FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `domains_hostname_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `organization_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `referral_code_user_id_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `referral_code_code_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `referrals_referred_user_id_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `session_token_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `user_email_unique`;--> statement-breakpoint
CREATE INDEX `domains_organization_idx` ON `domains` (`organization_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_party_id_uidx` ON `customers` (`party_id`);--> statement-breakpoint
CREATE INDEX `customers_user_id_idx` ON `customers` (`user_id`);--> statement-breakpoint
CREATE INDEX `customers_organization_id_idx` ON `customers` (`organization_id`);--> statement-breakpoint
CREATE INDEX `customers_source_system_source_id_idx` ON `customers` (`source_system`,`source_id`);--> statement-breakpoint
CREATE INDEX `orders_customer_id_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_organization_id_idx` ON `orders` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `parties_user_id_uidx` ON `parties` (`user_id`);--> statement-breakpoint
CREATE INDEX `parties_organization_id_idx` ON `parties` (`organization_id`);--> statement-breakpoint
CREATE INDEX `parties_kind_idx` ON `parties` (`kind`);--> statement-breakpoint
CREATE INDEX `payments_order_id_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `payments_customer_id_idx` ON `payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `payments_party_id_idx` ON `payments` (`party_id`);--> statement-breakpoint
CREATE INDEX `payments_user_id_idx` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `payments_status_completed_at_idx` ON `payments` (`status`,`completed_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_logs_actor_user_id_idx` ON `admin_audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `admin_audit_logs_entity_type_entity_id_idx` ON `admin_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `admin_audit_logs_created_at_idx` ON `admin_audit_logs` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_profiles_user_id_uidx` ON `affiliate_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_profiles_customer_id_uidx` ON `affiliate_profiles` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_deliveries_campaign_contact_uidx` ON `campaign_deliveries` (`campaign_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `campaign_deliveries_customer_id_idx` ON `campaign_deliveries` (`customer_id`);--> statement-breakpoint
CREATE INDEX `campaign_deliveries_status_idx` ON `campaign_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `crm_companies_organization_id_idx` ON `crm_companies` (`organization_id`);--> statement-breakpoint
CREATE INDEX `crm_companies_primary_contact_id_idx` ON `crm_companies` (`primary_contact_id`);--> statement-breakpoint
CREATE INDEX `crm_companies_domain_idx` ON `crm_companies` (`domain`);--> statement-breakpoint
CREATE INDEX `crm_companies_external_idx` ON `crm_companies` (`external_source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_contacts_party_id_uidx` ON `crm_contacts` (`party_id`);--> statement-breakpoint
CREATE INDEX `crm_contacts_user_id_idx` ON `crm_contacts` (`user_id`);--> statement-breakpoint
CREATE INDEX `crm_contacts_company_id_idx` ON `crm_contacts` (`company_id`);--> statement-breakpoint
CREATE INDEX `crm_contacts_status_idx` ON `crm_contacts` (`status`);--> statement-breakpoint
CREATE INDEX `crm_contacts_marketing_status_idx` ON `crm_contacts` (`marketing_status`);--> statement-breakpoint
CREATE INDEX `crm_contacts_external_source_external_id_idx` ON `crm_contacts` (`external_source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_contacts_companies_contact_company_uidx` ON `crm_contacts_companies` (`contact_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `crm_contacts_companies_company_idx` ON `crm_contacts_companies` (`company_id`);--> statement-breakpoint
CREATE INDEX `crm_deals_contact_id_idx` ON `crm_deals` (`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_deals_order_id_idx` ON `crm_deals` (`order_id`);--> statement-breakpoint
CREATE INDEX `crm_deals_assigned_to_idx` ON `crm_deals` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `crm_deals_stage_priority_idx` ON `crm_deals` (`stage`,`priority`);--> statement-breakpoint
CREATE INDEX `crm_deals_expected_close_date_idx` ON `crm_deals` (`expected_close_date`);--> statement-breakpoint
CREATE INDEX `crm_deals_external_idx` ON `crm_deals` (`external_source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_deals_companies_deal_company_uidx` ON `crm_deals_companies` (`deal_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `crm_deals_companies_company_idx` ON `crm_deals_companies` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_deals_contacts_deal_contact_uidx` ON `crm_deals_contacts` (`deal_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_deals_contacts_contact_idx` ON `crm_deals_contacts` (`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_fields_object_key_uidx` ON `crm_fields` (`object_id`,`key`);--> statement-breakpoint
CREATE INDEX `crm_fields_object_position_idx` ON `crm_fields` (`object_id`,`position`);--> statement-breakpoint
CREATE INDEX `crm_fields_relation_object_idx` ON `crm_fields` (`relation_object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_invoices_reference_uidx` ON `crm_invoices` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_invoices_hash_uidx` ON `crm_invoices` (`hash`);--> statement-breakpoint
CREATE INDEX `crm_invoices_owner_id_idx` ON `crm_invoices` (`owner_id`);--> statement-breakpoint
CREATE INDEX `crm_invoices_contact_id_idx` ON `crm_invoices` (`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_invoices_company_id_idx` ON `crm_invoices` (`company_id`);--> statement-breakpoint
CREATE INDEX `crm_invoices_order_id_idx` ON `crm_invoices` (`order_id`);--> statement-breakpoint
CREATE INDEX `crm_invoices_quote_id_idx` ON `crm_invoices` (`quote_id`);--> statement-breakpoint
CREATE INDEX `crm_invoices_status_due_date_idx` ON `crm_invoices` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `crm_invoices_external_idx` ON `crm_invoices` (`external_source`,`external_id`);--> statement-breakpoint
CREATE INDEX `crm_line_items_deal_id_idx` ON `crm_line_items` (`deal_id`);--> statement-breakpoint
CREATE INDEX `crm_line_items_product_id_idx` ON `crm_line_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `crm_line_items_external_idx` ON `crm_line_items` (`external_source`,`external_id`);--> statement-breakpoint
CREATE INDEX `crm_notes_contact_id_idx` ON `crm_notes` (`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_notes_company_id_idx` ON `crm_notes` (`company_id`);--> statement-breakpoint
CREATE INDEX `crm_notes_deal_id_idx` ON `crm_notes` (`deal_id`);--> statement-breakpoint
CREATE INDEX `crm_notes_author_user_id_idx` ON `crm_notes` (`author_user_id`);--> statement-breakpoint
CREATE INDEX `crm_notes_created_at_idx` ON `crm_notes` (`created_at`);--> statement-breakpoint
CREATE INDEX `crm_notes_external_idx` ON `crm_notes` (`external_source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_objects_key_uidx` ON `crm_objects` (`key`);--> statement-breakpoint
CREATE INDEX `crm_objects_source_type_idx` ON `crm_objects` (`source_type`);--> statement-breakpoint
CREATE INDEX `crm_objects_active_position_idx` ON `crm_objects` (`is_active`,`position`);--> statement-breakpoint
CREATE INDEX `crm_objects_external_idx` ON `crm_objects` (`external_source`,`external_id`);--> statement-breakpoint
CREATE INDEX `crm_products_external_idx` ON `crm_products` (`external_source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_quotes_reference_uidx` ON `crm_quotes` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_quotes_hash_uidx` ON `crm_quotes` (`hash`);--> statement-breakpoint
CREATE INDEX `crm_quotes_owner_id_idx` ON `crm_quotes` (`owner_id`);--> statement-breakpoint
CREATE INDEX `crm_quotes_contact_id_idx` ON `crm_quotes` (`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_quotes_deal_id_idx` ON `crm_quotes` (`deal_id`);--> statement-breakpoint
CREATE INDEX `crm_quotes_status_idx` ON `crm_quotes` (`status`);--> statement-breakpoint
CREATE INDEX `crm_quotes_external_idx` ON `crm_quotes` (`external_source`,`external_id`);--> statement-breakpoint
CREATE INDEX `crm_record_activity_record_idx` ON `crm_record_activity` (`object_key`,`record_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `crm_record_activity_actor_user_id_idx` ON `crm_record_activity` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `crm_record_activity_task_id_idx` ON `crm_record_activity` (`task_id`);--> statement-breakpoint
CREATE INDEX `crm_record_activity_note_id_idx` ON `crm_record_activity` (`note_id`);--> statement-breakpoint
CREATE INDEX `crm_record_activity_ticket_id_idx` ON `crm_record_activity` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `crm_record_activity_deal_id_idx` ON `crm_record_activity` (`deal_id`);--> statement-breakpoint
CREATE INDEX `crm_record_layouts_object_default_idx` ON `crm_record_layouts` (`object_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `crm_record_layouts_owner_user_id_idx` ON `crm_record_layouts` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `crm_subscriptions_customer_id_idx` ON `crm_subscriptions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `crm_subscriptions_company_id_idx` ON `crm_subscriptions` (`company_id`);--> statement-breakpoint
CREATE INDEX `crm_subscriptions_contact_id_idx` ON `crm_subscriptions` (`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_subscriptions_status_idx` ON `crm_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `crm_subscriptions_external_idx` ON `crm_subscriptions` (`external_source`,`external_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_related_record_idx` ON `crm_tasks` (`related_object_key`,`related_record_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_status_due_at_idx` ON `crm_tasks` (`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `crm_tasks_assigned_to_idx` ON `crm_tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `crm_tasks_contact_id_idx` ON `crm_tasks` (`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_company_id_idx` ON `crm_tasks` (`company_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_deal_id_idx` ON `crm_tasks` (`deal_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_ticket_id_idx` ON `crm_tasks` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_customer_id_idx` ON `crm_tasks` (`customer_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_external_idx` ON `crm_tasks` (`external_source`,`external_id`);--> statement-breakpoint
CREATE INDEX `crm_tickets_contact_id_idx` ON `crm_tickets` (`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_tickets_customer_id_idx` ON `crm_tickets` (`customer_id`);--> statement-breakpoint
CREATE INDEX `crm_tickets_assigned_to_idx` ON `crm_tickets` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `crm_tickets_status_priority_idx` ON `crm_tickets` (`status`,`priority`);--> statement-breakpoint
CREATE INDEX `crm_tickets_external_idx` ON `crm_tickets` (`external_source`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_tickets_companies_ticket_company_uidx` ON `crm_tickets_companies` (`ticket_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `crm_tickets_companies_company_idx` ON `crm_tickets_companies` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_tickets_contacts_ticket_contact_uidx` ON `crm_tickets_contacts` (`ticket_id`,`contact_id`);--> statement-breakpoint
CREATE INDEX `crm_tickets_contacts_contact_idx` ON `crm_tickets_contacts` (`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm_view_favorites_view_user_uidx` ON `crm_view_favorites` (`view_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `crm_view_favorites_user_idx` ON `crm_view_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `crm_views_object_type_idx` ON `crm_views` (`object_id`,`type`);--> statement-breakpoint
CREATE INDEX `crm_views_object_default_idx` ON `crm_views` (`object_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `crm_views_owner_user_id_idx` ON `crm_views` (`owner_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_channel_subscriptions_provider_subscription_uidx` ON `customer_channel_subscriptions` (`provider`,`channel`,`provider_subscription_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_channel_subscriptions_provider_token_uidx` ON `customer_channel_subscriptions` (`provider`,`channel`,`token_hash`);--> statement-breakpoint
CREATE INDEX `customer_channel_subscriptions_contact_idx` ON `customer_channel_subscriptions` (`contact_id`);--> statement-breakpoint
CREATE INDEX `customer_channel_subscriptions_customer_idx` ON `customer_channel_subscriptions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `customer_channel_subscriptions_user_idx` ON `customer_channel_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `customer_channel_subscriptions_status_idx` ON `customer_channel_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `customer_channel_subscriptions_channel_status_idx` ON `customer_channel_subscriptions` (`channel`,`status`);--> statement-breakpoint
CREATE INDEX `customer_channel_subscriptions_external_idx` ON `customer_channel_subscriptions` (`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `marketing_campaigns_segment_id_idx` ON `marketing_campaigns` (`segment_id`);--> statement-breakpoint
CREATE INDEX `marketing_campaigns_status_scheduled_at_idx` ON `marketing_campaigns` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `not_found_events_path_idx` ON `not_found_events` (`path`);--> statement-breakpoint
CREATE INDEX `not_found_events_resolved_redirect_id_idx` ON `not_found_events` (`resolved_redirect_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `notification_delivery_records_dedupe_key_uidx` ON `notification_delivery_records` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notification_delivery_records_order_id_idx` ON `notification_delivery_records` (`order_id`);--> statement-breakpoint
CREATE INDEX `notification_delivery_records_customer_id_idx` ON `notification_delivery_records` (`customer_id`);--> statement-breakpoint
CREATE INDEX `notification_delivery_records_support_ticket_id_idx` ON `notification_delivery_records` (`support_ticket_id`);--> statement-breakpoint
CREATE INDEX `notification_delivery_records_source_idx` ON `notification_delivery_records` (`source_entity_type`,`source_entity_id`);--> statement-breakpoint
CREATE INDEX `notification_delivery_records_retry_idx` ON `notification_delivery_records` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE INDEX `notification_delivery_records_expires_at_idx` ON `notification_delivery_records` (`expires_at`);--> statement-breakpoint
CREATE INDEX `redirect_rules_match_type_active_idx` ON `redirect_rules` (`match_type`,`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_action_deliveries_idempotency_uidx` ON `workflow_action_deliveries` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `workflow_action_deliveries_run_idx` ON `workflow_action_deliveries` (`workflow_run_id`);--> statement-breakpoint
CREATE INDEX `workflow_action_deliveries_step_run_idx` ON `workflow_action_deliveries` (`workflow_step_run_id`);--> statement-breakpoint
CREATE INDEX `workflow_action_deliveries_status_idx` ON `workflow_action_deliveries` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_definitions_key_uidx` ON `workflow_definitions` (`key`);--> statement-breakpoint
CREATE INDEX `workflow_definitions_status_idx` ON `workflow_definitions` (`status`);--> statement-breakpoint
CREATE INDEX `workflow_definitions_trigger_type_idx` ON `workflow_definitions` (`trigger_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_enrollments_dedupe_uidx` ON `workflow_enrollments` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `workflow_enrollments_definition_idx` ON `workflow_enrollments` (`workflow_definition_id`);--> statement-breakpoint
CREATE INDEX `workflow_enrollments_subject_idx` ON `workflow_enrollments` (`subject_type`,`subject_id`);--> statement-breakpoint
CREATE INDEX `workflow_enrollments_status_idx` ON `workflow_enrollments` (`status`);--> statement-breakpoint
CREATE INDEX `workflow_enrollments_trigger_event_id_idx` ON `workflow_enrollments` (`trigger_event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_runs_instance_key_uidx` ON `workflow_runs` (`workflow_instance_key`);--> statement-breakpoint
CREATE INDEX `workflow_runs_definition_idx` ON `workflow_runs` (`workflow_definition_id`);--> statement-breakpoint
CREATE INDEX `workflow_runs_enrollment_idx` ON `workflow_runs` (`workflow_enrollment_id`);--> statement-breakpoint
CREATE INDEX `workflow_runs_status_idx` ON `workflow_runs` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_step_runs_run_step_uidx` ON `workflow_step_runs` (`workflow_run_id`,`step_key`);--> statement-breakpoint
CREATE INDEX `workflow_step_runs_run_idx` ON `workflow_step_runs` (`workflow_run_id`);--> statement-breakpoint
CREATE INDEX `workflow_step_runs_status_idx` ON `workflow_step_runs` (`status`);--> statement-breakpoint
CREATE INDEX `workflow_suppressions_subject_idx` ON `workflow_suppressions` (`subject_type`,`subject_id`);--> statement-breakpoint
CREATE INDEX `workflow_suppressions_scope_key_idx` ON `workflow_suppressions` (`scope_key`);--> statement-breakpoint
CREATE INDEX `workflow_suppressions_active_until_idx` ON `workflow_suppressions` (`active_until`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_trigger_events_dedupe_uidx` ON `workflow_trigger_events` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `workflow_trigger_events_type_idx` ON `workflow_trigger_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `workflow_trigger_events_subject_idx` ON `workflow_trigger_events` (`subject_type`,`subject_id`);--> statement-breakpoint
CREATE INDEX `workflow_trigger_events_customer_id_idx` ON `workflow_trigger_events` (`customer_id`);--> statement-breakpoint
CREATE INDEX `workflow_trigger_events_order_id_idx` ON `workflow_trigger_events` (`order_id`);