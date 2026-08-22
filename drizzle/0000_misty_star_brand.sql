CREATE TABLE `account_status_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`target_user_id` text NOT NULL,
	`previous_status` text NOT NULL,
	`new_status` text NOT NULL,
	`reason` text NOT NULL,
	`suspended_until` integer,
	`actor_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_status_events_target` ON `account_status_events` (`target_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` text,
	`target_user_id` text,
	`action` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `billing_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payer_type` text DEFAULT 'individual' NOT NULL,
	`legal_name` text DEFAULT '' NOT NULL,
	`document_type` text DEFAULT 'cpf' NOT NULL,
	`document_number` text,
	`company_name` text,
	`billing_email` text DEFAULT '' NOT NULL,
	`billing_phone` text DEFAULT '' NOT NULL,
	`postal_code` text DEFAULT '' NOT NULL,
	`street` text DEFAULT '' NOT NULL,
	`number` text DEFAULT '' NOT NULL,
	`complement` text,
	`neighborhood` text,
	`city` text DEFAULT '' NOT NULL,
	`state` text DEFAULT '' NOT NULL,
	`country` text DEFAULT 'Brasil' NOT NULL,
	`plan_code` text DEFAULT 'gratuito' NOT NULL,
	`subscription_status` text DEFAULT 'sem_assinatura' NOT NULL,
	`provider_customer_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_billing_subscription` ON `billing_profiles` (`subscription_status`);--> statement-breakpoint
CREATE TABLE `consent_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_version` text NOT NULL,
	`accepted` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_consent_user` ON `consent_events` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `users` (
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
	CONSTRAINT "users_account_type_check" CHECK("users"."account_type" IN ('human','system')),
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('user','professor','manager','admin')),
	CONSTRAINT "users_status_check" CHECK("users"."status" IN ('active','inactive','blocked','suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_auth_user_id` ON `users` (`auth_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_role_status` ON `users` (`role`,`status`);