CREATE TABLE `search_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resource_id` text NOT NULL,
	`normalized_query` text NOT NULL,
	`helpful` integer NOT NULL,
	`trace_id` text DEFAULT '' NOT NULL,
	`retrieval_status` text DEFAULT '' NOT NULL,
	`session_id` text DEFAULT '' NOT NULL,
	`match_score` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_resource` ON `search_feedback` (`resource_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_feedback_created` ON `search_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_feedback_status_created` ON `search_feedback` (`retrieval_status`,`created_at`);--> statement-breakpoint
CREATE TABLE `search_traces` (
	`trace_id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`normalized_query` text NOT NULL,
	`status` text NOT NULL,
	`candidate_count` integer DEFAULT 0 NOT NULL,
	`retrieval_mode` text DEFAULT '' NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_traces_created` ON `search_traces` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_traces_status_created` ON `search_traces` (`status`,`created_at`);