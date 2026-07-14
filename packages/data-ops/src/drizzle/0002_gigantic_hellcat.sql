CREATE TABLE `outbox_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`processed_at` integer
);
--> statement-breakpoint
CREATE INDEX `outbox_events_type_idx` ON `outbox_events` (`type`);