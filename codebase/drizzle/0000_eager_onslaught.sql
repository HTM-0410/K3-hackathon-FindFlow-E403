CREATE TABLE `realtime_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`external_id` text NOT NULL,
	`channel_name` text DEFAULT '' NOT NULL,
	`author_name` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_realtime_kind_occurred` ON `realtime_events` (`kind`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_realtime_occurred` ON `realtime_events` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `realtime_stats` (
	`id` integer PRIMARY KEY NOT NULL,
	`total_messages` integer DEFAULT 0 NOT NULL,
	`total_joins` integer DEFAULT 0 NOT NULL,
	`total_leaves` integer DEFAULT 0 NOT NULL,
	`total_reactions` integer DEFAULT 0 NOT NULL,
	`total_voice` integer DEFAULT 0 NOT NULL,
	`last_heartbeat` integer DEFAULT 0 NOT NULL,
	`bot_started_at` integer DEFAULT 0 NOT NULL
);
