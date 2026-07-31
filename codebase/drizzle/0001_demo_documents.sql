CREATE TABLE `demo_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`source` text DEFAULT 'discord-demo' NOT NULL,
	`guild_id` text DEFAULT '' NOT NULL,
	`channel_id` text DEFAULT '' NOT NULL,
	`channel_name` text DEFAULT '' NOT NULL,
	`message_id` text DEFAULT '' NOT NULL,
	`message_url` text DEFAULT '' NOT NULL,
	`author_name` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`host` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`snippet` text DEFAULT '' NOT NULL,
	`content_length` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_message` text DEFAULT '' NOT NULL,
	`fetch_attempts` integer DEFAULT 0 NOT NULL,
	`embedding` text DEFAULT '[]' NOT NULL,
	`detected_at` integer NOT NULL,
	`processed_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_demo_documents_external_id` ON `demo_documents` (`external_id`);--> statement-breakpoint
CREATE INDEX `idx_demo_documents_status` ON `demo_documents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_demo_documents_detected` ON `demo_documents` (`detected_at`);
