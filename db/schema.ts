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
    professionalType: text('professional_type').notNull().default('student'),
    educatorVerificationStatus: text('educator_verification_status')
      .notNull()
      .default('not_requested'),
    institutionalEmail: text('institutional_email'),
    functionalId: text('functional_id'),
    cpf: text('cpf'),
    passwordHash: text('password_hash'),
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
    check('users_professional_type_check', sql`${table.professionalType} IN ('student','teacher','education_professional')`),
    check('users_educator_verification_status_check', sql`${table.educatorVerificationStatus} IN ('not_requested','pending','approved','rejected')`),
  ],
);

export const localAuthSessions = sqliteTable(
  'local_auth_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    revokedAt: integer('revoked_at'),
  },
  (table) => [
    index('idx_local_sessions_user').on(table.userId, table.revokedAt),
    index('idx_local_sessions_expiry').on(table.expiresAt),
  ],
);

export const teacherSchools = sqliteTable(
  'teacher_schools',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    city: text('city'),
    state: text('state'),
    institutionalEmail: text('institutional_email'),
    functionalId: text('functional_id'),
    logoKey: text('logo_key'),
    headerTitle: text('header_title').notNull().default('Lista de Exercícios'),
    headerSubtitle: text('header_subtitle').notNull().default('Física'),
    footerText: text('footer_text').notNull().default(''),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    index('idx_teacher_schools_user').on(table.userId, table.deletedAt),
    index('idx_teacher_schools_active').on(table.userId, table.isActive),
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

export const billingPlans = sqliteTable(
  'billing_plans',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    licenseType: text('license_type').notNull().default('individual'),
    billingCycle: text('billing_cycle').notNull().default('monthly'),
    priceCents: integer('price_cents').notNull().default(0),
    currency: text('currency').notNull().default('BRL'),
    maxUsers: integer('max_users').notNull().default(1),
    featuresJson: text('features_json').notNull().default('[]'),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    uniqueIndex('idx_billing_plans_code').on(table.code),
    index('idx_billing_plans_status').on(table.status),
  ],
);

export const paymentMethods = sqliteTable(
  'payment_methods',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    methodType: text('method_type').notNull().default('pix'),
    provider: text('provider').notNull().default('manual'),
    instructionsJson: text('instructions_json').notNull().default('{}'),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [index('idx_payment_methods_status').on(table.status)],
);

export const academicContentItems = sqliteTable(
  'academic_content_items',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    kind: text('kind').notNull().default('question_set'),
    institution: text('institution').notNull().default('Geral'),
    topic: text('topic').notNull().default('Física geral'),
    edition: text('edition').notNull().default(''),
    status: text('status').notNull().default('draft'),
    ownerUserId: text('owner_user_id').references(() => users.id),
    sourceReference: text('source_reference'),
    notes: text('notes'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    index('idx_academic_content_status').on(table.status),
    index('idx_academic_content_institution').on(table.institution, table.edition),
  ],
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

export const userQuestionProgress = sqliteTable(
  'user_question_progress',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull().references(() => users.id),
    questionId: integer('question_id').notNull(),
    questionCode: text('question_code').notNull(),
    institution: text('institution').notNull(),
    topic: text('topic').notNull(),
    edition: text('edition').notNull(),
    status: text('status').notNull().default('viewed'),
    selectedAnswer: integer('selected_answer'),
    correctAnswer: integer('correct_answer'),
    attempts: integer('attempts').notNull().default(0),
    correctAttempts: integer('correct_attempts').notNull().default(0),
    firstSeenAt: integer('first_seen_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    lastAnsweredAt: integer('last_answered_at'),
  },
  (table) => [
    uniqueIndex('idx_progress_user_question').on(table.userId, table.questionId),
    index('idx_progress_user_status').on(table.userId, table.status),
    index('idx_progress_user_topic').on(table.userId, table.topic),
  ],
);

export const questionCurations = sqliteTable(
  'question_curations',
  {
    questionId: integer('question_id').primaryKey(),
    visibilityStatus: text('visibility_status').notNull().default('active'),
    institution: text('institution'),
    institutionName: text('institution_name'),
    edition: text('edition'),
    phase: text('phase'),
    year: integer('year'),
    number: integer('number'),
    topic: text('topic'),
    level: text('level'),
    title: text('title'),
    statementText: text('statement_text'),
    optionsJson: text('options_json').notNull().default('[]'),
    answer: integer('answer'),
    answerLabel: text('answer_label'),
    questionStatus: text('question_status'),
    video: text('video'),
    scriptStatus: text('script_status'),
    sourcePage: integer('source_page'),
    sourceFile: text('source_file'),
    sourceImage: text('source_image'),
    essentialFigure: integer('essential_figure', { mode: 'boolean' }),
    bnccCodesJson: text('bncc_codes_json').notNull().default('[]'),
    notes: text('notes'),
    updatedBy: text('updated_by').references(() => users.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    index('idx_question_curations_visibility').on(table.visibilityStatus),
    index('idx_question_curations_updated').on(table.updatedAt),
    check('question_curations_visibility_check', sql`${table.visibilityStatus} IN ('active','inactive','deleted')`),
  ],
);

export const accessInvites = sqliteTable(
  'access_invites',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    email: text('email'),
    role: text('role').notNull().default('user'),
    professionalType: text('professional_type').notNull().default('student'),
    licenseType: text('license_type').notNull().default('gratuito'),
    maxUses: integer('max_uses').notNull().default(1),
    usedCount: integer('used_count').notNull().default(0),
    expiresAt: integer('expires_at'),
    status: text('status').notNull().default('active'),
    notes: text('notes').notNull().default(''),
    createdBy: text('created_by').references(() => users.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    uniqueIndex('idx_access_invites_code').on(table.code),
    index('idx_access_invites_email').on(table.email),
    index('idx_access_invites_status').on(table.status),
    check('access_invites_role_check', sql`${table.role} IN ('user','professor','manager','admin')`),
    check('access_invites_professional_type_check', sql`${table.professionalType} IN ('student','teacher','education_professional')`),
    check('access_invites_status_check', sql`${table.status} IN ('active','inactive','expired','exhausted')`),
  ],
);
