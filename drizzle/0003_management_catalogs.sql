CREATE TABLE IF NOT EXISTS `billing_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`license_type` text DEFAULT 'individual' NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`max_users` integer DEFAULT 1 NOT NULL,
	`features_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_billing_plans_code` ON `billing_plans` (`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_billing_plans_status` ON `billing_plans` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`method_type` text DEFAULT 'pix' NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`instructions_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_payment_methods_status` ON `payment_methods` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `academic_content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'question_set' NOT NULL,
	`institution` text DEFAULT 'Geral' NOT NULL,
	`topic` text DEFAULT 'Física geral' NOT NULL,
	`edition` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`owner_user_id` text,
	`source_reference` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_academic_content_status` ON `academic_content_items` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_academic_content_institution` ON `academic_content_items` (`institution`,`edition`);--> statement-breakpoint
INSERT INTO `users` (
	`id`, `email`, `full_name`, `phone`, `education_level`, `account_type`,
	`role`, `status`, `status_reason`, `professional_type`, `educator_verification_status`,
	`profile_complete`, `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES (
	'professor-fabio-honorio', 'fabiohoronorio@msn.com', 'Fábio Honório', '',
	'professor', 'human', 'professor', 'active',
	'Cadastro professor solicitado por Welber. Acesso via login seguro do site; senha simples não armazenada.',
	'teacher', 'approved', 0, 'system-codex-agent', 'system-codex-agent', 1787579999000, 1787579999000
)
ON CONFLICT(`email`) DO UPDATE SET
	`full_name` = excluded.`full_name`,
	`role` = 'professor',
	`status` = 'active',
	`professional_type` = 'teacher',
	`educator_verification_status` = 'approved',
	`updated_by` = excluded.`updated_by`,
	`updated_at` = excluded.`updated_at`;
--> statement-breakpoint
INSERT INTO `audit_logs` (`actor_user_id`, `target_user_id`, `action`, `details_json`, `created_at`)
SELECT 'system-codex-agent', 'professor-fabio-honorio', 'user.professor_reserved', '{"email":"fabiohoronorio@msn.com","passwordStored":false}', 1787579999000
WHERE NOT EXISTS (
	SELECT 1 FROM `audit_logs` WHERE `action` = 'user.professor_reserved'
);
