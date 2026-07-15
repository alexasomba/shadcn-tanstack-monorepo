CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`hostname` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_hostname_unique` ON `domains` (`hostname`);--> statement-breakpoint
CREATE INDEX `domains_organization_idx` ON `domains` (`organization_id`);