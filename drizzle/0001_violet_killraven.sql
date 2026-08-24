CREATE TABLE `user_question_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`question_id` integer NOT NULL,
	`question_code` text NOT NULL,
	`institution` text NOT NULL,
	`topic` text NOT NULL,
	`edition` text NOT NULL,
	`status` text DEFAULT 'viewed' NOT NULL,
	`selected_answer` integer,
	`correct_answer` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_attempts` integer DEFAULT 0 NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`last_answered_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_progress_user_question` ON `user_question_progress` (`user_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `idx_progress_user_status` ON `user_question_progress` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_progress_user_topic` ON `user_question_progress` (`user_id`,`topic`);