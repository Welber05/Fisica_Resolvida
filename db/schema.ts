import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    authUserId: text('auth_user_id'),
    email: text('email').notNull(),
    fullName: text('full_name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    educationLevel: text('education_level').notNull().default(''),
    accountType: text('account_type').notNull().default('human'),
    role: text('role').notNull().default('user'),
    status: text('status').notNull().default('active'),
    statusReason: text('status_reason'),
    suspendedUntil: integer('suspended_until'),
    profileComplete: integer('profile_complete', { mode: 'boolean' })
      .notNull()
      .default(false),
    avatarKey: text('avatar_key'),
    lattesUrl: text('lattes_url'),
    orcid: text('orcid'),
    socialLinksJson: text('social_links_json').notNull().default('{}'),
    addressPostalCode: text('address_postal_code').notNull().default(''),
    addressStreet: text('address_street').notNull().default(''),
    addressNumber: text('address_number').notNull().default(''),
    addressComplement: text('address_complement'),
    addressNeighborhood: text('address_neighborhood'),
    addressCity: text('address_city').notNull().default(''),
    addressState: text('address_state').notNull().default(''),
    addressCountry: text('address_country').notNull().default('Brasil'),
    privacyAcceptedAt: integer('privacy_accepted_at'),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    uniqueIndex('idx_users_auth_user_id').on(table.authUserId),
    uniqueIndex('idx_users_email').on(table.email),
    index('idx_users_role_status').on(table.role, table.status),
    check('users_account_type_check', sql`${table.accountType} IN ('human','system')`),
    check('users_role_check', sql`${table.role} IN ('user','professor','manager','admin')`),
    check('users_status_check', sql`${table.status} IN ('active','inactive','blocked','suspended')`),
  ],
);

export const billingProfiles = sqliteTable(
  'billing_profiles',
  {
    userId: text('user_id').primaryKey().references(() => users.id),
    payerType: text('payer_type').notNull().default('individual'),
    legalName: text('legal_name').notNull().default(''),
    documentType: text('document_type').notNull().default('cpf'),
    documentNumber: text('document_number'),
    companyName: text('company_name'),
    billingEmail: text('billing_email').notNull().default(''),
    billingPhone: text('billing_phone').notNull().default(''),
    postalCode: text('postal_code').notNull().default(''),
    street: text('street').notNull().default(''),
    number: text('number').notNull().default(''),
    complement: text('complement'),
    neighborhood: text('neighborhood'),
    city: text('city').notNull().default(''),
    state: text('state').notNull().default(''),
    country: text('country').notNull().default('Brasil'),
    planCode: text('plan_code').notNull().default('gratuito'),
    subscriptionStatus: text('subscription_status').notNull().default('sem_assinatura'),
    providerCustomerId: text('provider_customer_id'),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('idx_billing_subscription').on(table.subscriptionStatus)],
);

export const accountStatusEvents = sqliteTable(
  'account_status_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    targetUserId: text('target_user_id').notNull().references(() => users.id),
    previousStatus: text('previous_status').notNull(),
    newStatus: text('new_status').notNull(),
    reason: text('reason').notNull(),
    suspendedUntil: integer('suspended_until'),
    actorUserId: text('actor_user_id').notNull().references(() => users.id),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_status_events_target').on(table.targetUserId, table.createdAt)],
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    actorUserId: text('actor_user_id'),
    targetUserId: text('target_user_id'),
    action: text('action').notNull(),
    detailsJson: text('details_json').notNull().default('{}'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_audit_created_at').on(table.createdAt)],
);

export const consentEvents = sqliteTable(
  'consent_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    documentType: text('document_type').notNull(),
    documentVersion: text('document_version').notNull(),
    accepted: integer('accepted', { mode: 'boolean' }).notNull(),
    occurredAt: integer('occurred_at').notNull(),
  },
  (table) => [index('idx_consent_user').on(table.userId, table.occurredAt)],
);
