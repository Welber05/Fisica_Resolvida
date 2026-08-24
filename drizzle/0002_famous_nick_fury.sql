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
CREATE INDEX `idx_teacher_schools_active` ON `teacher_schools` (`user_id`,`is_active`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text,
	`email` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`education_level` text DEFAULT '' NOT NULL,
	`account_type` text DEFAULT 'human' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`status_reason` text,
	`suspended_until` integer,
	`professional_type` text DEFAULT 'student' NOT NULL,
	`educator_verification_status` text DEFAULT 'not_requested' NOT NULL,
	`institutional_email` text,
	`functional_id` text,
	`cpf` text,
	`profile_complete` integer DEFAULT false NOT NULL,
	`avatar_key` text,
	`lattes_url` text,
	`orcid` text,
	`social_links_json` text DEFAULT '{}' NOT NULL,
	`address_postal_code` text DEFAULT '' NOT NULL,
	`address_street` text DEFAULT '' NOT NULL,
	`address_number` text DEFAULT '' NOT NULL,
	`address_complement` text,
	`address_neighborhood` text,
	`address_city` text DEFAULT '' NOT NULL,
	`address_state` text DEFAULT '' NOT NULL,
	`address_country` text DEFAULT 'Brasil' NOT NULL,
	`privacy_accepted_at` integer,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "users_account_type_check" CHECK("__new_users"."account_type" IN ('human','system')),
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" IN ('user','professor','manager','admin')),
	CONSTRAINT "users_status_check" CHECK("__new_users"."status" IN ('active','inactive','blocked','suspended')),
	CONSTRAINT "users_professional_type_check" CHECK("__new_users"."professional_type" IN ('student','teacher','education_professional')),
	CONSTRAINT "users_educator_verification_status_check" CHECK("__new_users"."educator_verification_status" IN ('not_requested','pending','approved','rejected'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "auth_user_id", "email", "full_name", "phone", "education_level", "account_type", "role", "status", "status_reason", "suspended_until", "professional_type", "educator_verification_status", "institutional_email", "functional_id", "cpf", "profile_complete", "avatar_key", "lattes_url", "orcid", "social_links_json", "address_postal_code", "address_street", "address_number", "address_complement", "address_neighborhood", "address_city", "address_state", "address_country", "privacy_accepted_at", "created_by", "updated_by", "created_at", "updated_at", "deleted_at") SELECT "id", "auth_user_id", "email", "full_name", "phone", "education_level", "account_type", "role", "status", "status_reason", "suspended_until", 'student', 'not_requested', NULL, NULL, NULL, "profile_complete", "avatar_key", "lattes_url", "orcid", "social_links_json", "address_postal_code", "address_street", "address_number", "address_complement", "address_neighborhood", "address_city", "address_state", "address_country", "privacy_accepted_at", "created_by", "updated_by", "created_at", "updated_at", "deleted_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_auth_user_id` ON `users` (`auth_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_role_status` ON `users` (`role`,`status`);
