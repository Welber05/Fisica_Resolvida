CREATE TABLE IF NOT EXISTS `question_curations` (
	`question_id` integer PRIMARY KEY NOT NULL,
	`visibility_status` text DEFAULT 'active' NOT NULL,
	`institution` text,
	`institution_name` text,
	`edition` text,
	`phase` text,
	`year` integer,
	`number` integer,
	`topic` text,
	`level` text,
	`title` text,
	`statement_text` text,
	`options_json` text DEFAULT '[]' NOT NULL,
	`answer` integer,
	`answer_label` text,
	`question_status` text,
	`video` text,
	`script_status` text,
	`source_page` integer,
	`source_file` text,
	`source_image` text,
	`essential_figure` integer,
	`bncc_codes_json` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`updated_by` text REFERENCES `users`(`id`),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "question_curations_visibility_check" CHECK("question_curations"."visibility_status" IN ('active','inactive','deleted'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_question_curations_visibility` ON `question_curations` (`visibility_status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_question_curations_updated` ON `question_curations` (`updated_at`);
