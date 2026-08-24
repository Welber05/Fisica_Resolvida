ALTER TABLE `users` ADD COLUMN `professional_type` text DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `educator_verification_status` text DEFAULT 'not_requested' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `institutional_email` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `functional_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `cpf` text;--> statement-breakpoint
CREATE TABLE `teacher_schools` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`state` text,
	`institutional_email` text,
	`functional_id` text,
	`logo_key` text,
	`header_title` text DEFAULT 'Lista de Exercícios' NOT NULL,
	`header_subtitle` text DEFAULT 'Física' NOT NULL,
	`footer_text` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_teacher_schools_user` ON `teacher_schools` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_teacher_schools_active` ON `teacher_schools` (`user_id`,`is_active`);
