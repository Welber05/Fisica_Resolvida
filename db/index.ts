import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

let schemaReady: Promise<void> | null = null;

export const CODEX_ACTOR_ID = 'system-codex-agent';

export function getD1() {
  if (!env.DB) throw new Error('O banco D1 `DB` não está disponível.');
  return env.DB;
}

export function getFilesBucket() {
  if (!env.FILES) throw new Error('O armazenamento R2 `FILES` não está disponível.');
  return env.FILES;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export function getInitialAdminEmail() {
  return env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = initializeSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function initializeSchema() {
  const db = getD1();
  const fabioInitialPasswordHash =
    'pbkdf2:SHA-256:120000:4b230985d6563be50a71e1029cc81118:eb33b587435e1cabcc80dc12ab5f82ff14645115eb9ff3dceebd7b1a93dd74c5';
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      auth_user_id TEXT,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      education_level TEXT NOT NULL DEFAULT '',
      account_type TEXT NOT NULL DEFAULT 'human' CHECK (account_type IN ('human','system')),
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','professor','manager','admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked','suspended')),
      status_reason TEXT,
      suspended_until INTEGER,
      professional_type TEXT NOT NULL DEFAULT 'student' CHECK (professional_type IN ('student','teacher','education_professional')),
      educator_verification_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (educator_verification_status IN ('not_requested','pending','approved','rejected')),
      institutional_email TEXT,
      functional_id TEXT,
      cpf TEXT,
      password_hash TEXT,
      profile_complete INTEGER NOT NULL DEFAULT 0,
      avatar_key TEXT,
      lattes_url TEXT,
      orcid TEXT,
      social_links_json TEXT NOT NULL DEFAULT '{}',
      address_postal_code TEXT NOT NULL DEFAULT '',
      address_street TEXT NOT NULL DEFAULT '',
      address_number TEXT NOT NULL DEFAULT '',
      address_complement TEXT,
      address_neighborhood TEXT,
      address_city TEXT NOT NULL DEFAULT '',
      address_state TEXT NOT NULL DEFAULT '',
      address_country TEXT NOT NULL DEFAULT 'Brasil',
      privacy_accepted_at INTEGER,
      created_by TEXT,
      updated_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status)',
    `CREATE TABLE IF NOT EXISTS teacher_schools (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      city TEXT,
      state TEXT,
      institutional_email TEXT,
      functional_id TEXT,
      logo_key TEXT,
      header_title TEXT NOT NULL DEFAULT 'Lista de Exercícios',
      header_subtitle TEXT NOT NULL DEFAULT 'Física',
      footer_text TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_teacher_schools_user ON teacher_schools(user_id, deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_teacher_schools_active ON teacher_schools(user_id, is_active)',
    `CREATE TABLE IF NOT EXISTS billing_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      payer_type TEXT NOT NULL DEFAULT 'individual',
      legal_name TEXT NOT NULL DEFAULT '',
      document_type TEXT NOT NULL DEFAULT 'cpf',
      document_number TEXT,
      company_name TEXT,
      billing_email TEXT NOT NULL DEFAULT '',
      billing_phone TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      street TEXT NOT NULL DEFAULT '',
      number TEXT NOT NULL DEFAULT '',
      complement TEXT,
      neighborhood TEXT,
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT 'Brasil',
      plan_code TEXT NOT NULL DEFAULT 'gratuito',
      subscription_status TEXT NOT NULL DEFAULT 'sem_assinatura',
      provider_customer_id TEXT,
      updated_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_billing_subscription ON billing_profiles(subscription_status)',
    `CREATE TABLE IF NOT EXISTS billing_plans (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      license_type TEXT NOT NULL DEFAULT 'individual',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      price_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BRL',
      max_users INTEGER NOT NULL DEFAULT 1,
      features_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_plans_code ON billing_plans(code)',
    'CREATE INDEX IF NOT EXISTS idx_billing_plans_status ON billing_plans(status)',
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      method_type TEXT NOT NULL DEFAULT 'pix',
      provider TEXT NOT NULL DEFAULT 'manual',
      instructions_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_payment_methods_status ON payment_methods(status)',
    `CREATE TABLE IF NOT EXISTS academic_content_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'question_set',
      institution TEXT NOT NULL DEFAULT 'Geral',
      topic TEXT NOT NULL DEFAULT 'Física geral',
      edition TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      owner_user_id TEXT REFERENCES users(id),
      source_reference TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_academic_content_status ON academic_content_items(status)',
    'CREATE INDEX IF NOT EXISTS idx_academic_content_institution ON academic_content_items(institution, edition)',
    `CREATE TABLE IF NOT EXISTS account_status_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id TEXT NOT NULL REFERENCES users(id),
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      reason TEXT NOT NULL,
      suspended_until INTEGER,
      actor_user_id TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_status_events_target ON account_status_events(target_user_id, created_at)',
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT,
      target_user_id TEXT,
      action TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)',
    `CREATE TABLE IF NOT EXISTS consent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      document_type TEXT NOT NULL,
      document_version TEXT NOT NULL,
      accepted INTEGER NOT NULL,
      occurred_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_events(user_id, occurred_at)',
    `CREATE TABLE IF NOT EXISTS user_question_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      question_id INTEGER NOT NULL,
      question_code TEXT NOT NULL,
      institution TEXT NOT NULL,
      topic TEXT NOT NULL,
      edition TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'viewed',
      selected_answer INTEGER,
      correct_answer INTEGER,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct_attempts INTEGER NOT NULL DEFAULT 0,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      last_answered_at INTEGER
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_question ON user_question_progress(user_id, question_id)',
    'CREATE INDEX IF NOT EXISTS idx_progress_user_status ON user_question_progress(user_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_progress_user_topic ON user_question_progress(user_id, topic)',
    `CREATE TABLE IF NOT EXISTS question_curations (
      question_id INTEGER PRIMARY KEY,
      visibility_status TEXT NOT NULL DEFAULT 'active' CHECK (visibility_status IN ('active','inactive','deleted')),
      institution TEXT,
      institution_name TEXT,
      edition TEXT,
      phase TEXT,
      year INTEGER,
      number INTEGER,
      topic TEXT,
      level TEXT,
      title TEXT,
      statement_text TEXT,
      options_json TEXT NOT NULL DEFAULT '[]',
      answer INTEGER,
      answer_label TEXT,
      question_status TEXT,
      video TEXT,
      script_status TEXT,
      source_page INTEGER,
      source_file TEXT,
      source_image TEXT,
      essential_figure INTEGER,
      bncc_codes_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      updated_by TEXT REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_question_curations_visibility ON question_curations(visibility_status)',
    'CREATE INDEX IF NOT EXISTS idx_question_curations_updated ON question_curations(updated_at)',
    `CREATE TABLE IF NOT EXISTS access_invites (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','professor','manager','admin')),
      professional_type TEXT NOT NULL DEFAULT 'student' CHECK (professional_type IN ('student','teacher','education_professional')),
      license_type TEXT NOT NULL DEFAULT 'gratuito',
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','expired','exhausted')),
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_access_invites_code ON access_invites(code)',
    'CREATE INDEX IF NOT EXISTS idx_access_invites_email ON access_invites(email)',
    'CREATE INDEX IF NOT EXISTS idx_access_invites_status ON access_invites(status)',
    `CREATE TABLE IF NOT EXISTS local_auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      revoked_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_local_sessions_user ON local_auth_sessions(user_id, revoked_at)',
    'CREATE INDEX IF NOT EXISTS idx_local_sessions_expiry ON local_auth_sessions(expires_at)',
  ];

  await db.batch(statements.map((statement) => db.prepare(statement)));
  const userColumns = await db.prepare('PRAGMA table_info(users)').all<{ name: string }>();
  if (!userColumns.results.some((column) => column.name === 'account_type')) {
    await db
      .prepare("ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'human'")
      .run();
  }
  const userColumnNames = new Set(userColumns.results.map((column) => column.name));
  const userColumnBackfills = [
    ['professional_type', "ALTER TABLE users ADD COLUMN professional_type TEXT NOT NULL DEFAULT 'student'"],
    ['educator_verification_status', "ALTER TABLE users ADD COLUMN educator_verification_status TEXT NOT NULL DEFAULT 'not_requested'"],
    ['institutional_email', 'ALTER TABLE users ADD COLUMN institutional_email TEXT'],
    ['functional_id', 'ALTER TABLE users ADD COLUMN functional_id TEXT'],
    ['cpf', 'ALTER TABLE users ADD COLUMN cpf TEXT'],
    ['password_hash', 'ALTER TABLE users ADD COLUMN password_hash TEXT'],
  ] as const;
  for (const [column, statement] of userColumnBackfills) {
    if (!userColumnNames.has(column)) await db.prepare(statement).run();
  }

  const now = Date.now();
  const bootstrapStatements = [
    db
      .prepare(
        `INSERT OR IGNORE INTO users (
          id, email, full_name, education_level, account_type,
          role, status, profile_complete, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'outro', 'system', 'admin', 'active', 1, ?, ?, ?, ?)`,
      )
      .bind(
        CODEX_ACTOR_ID,
        'codex-agent@system.invalid',
        'Codex · automação',
        CODEX_ACTOR_ID,
        CODEX_ACTOR_ID,
        now,
        now,
      ),
    db
      .prepare('UPDATE users SET auth_user_id = NULL WHERE id = ? AND account_type = \'system\'')
      .bind(CODEX_ACTOR_ID),
    db
      .prepare(
        `INSERT INTO audit_logs (actor_user_id, target_user_id, action, details_json, created_at)
         SELECT ?, ?, 'system.codex_actor_registered', '{"loginEnabled":false}', ?
         WHERE NOT EXISTS (
           SELECT 1 FROM audit_logs WHERE action = 'system.codex_actor_registered'
         )`,
      )
      .bind(CODEX_ACTOR_ID, CODEX_ACTOR_ID, now),
    db
      .prepare(
        `INSERT INTO users (
          id, email, full_name, phone, education_level, account_type,
          role, status, status_reason, professional_type, educator_verification_status,
          profile_complete, password_hash, created_by, updated_by, created_at, updated_at
        ) VALUES (
          'professor-fabio-honorio', 'fabiohoronorio@msn.com', 'Fábio Honório', '',
          'professor', 'human', 'professor', 'active',
          'Cadastro professor solicitado por Welber. Acesso via login seguro do site; senha simples não armazenada.',
          'teacher', 'approved', 0, ?, ?, ?, ?, ?
        )
        ON CONFLICT(email) DO UPDATE SET
          full_name = excluded.full_name,
          role = 'professor',
          status = 'active',
          professional_type = 'teacher',
          educator_verification_status = 'approved',
          password_hash = COALESCE(users.password_hash, excluded.password_hash),
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at
        `,
      )
      .bind(fabioInitialPasswordHash, CODEX_ACTOR_ID, CODEX_ACTOR_ID, now, now),
    db
      .prepare(
        `INSERT INTO audit_logs (actor_user_id, target_user_id, action, details_json, created_at)
         SELECT ?, 'professor-fabio-honorio', 'user.professor_reserved', '{"email":"fabiohoronorio@msn.com","passwordStored":true}', ?
         WHERE NOT EXISTS (
           SELECT 1 FROM audit_logs WHERE action = 'user.professor_reserved'
         )`,
      )
      .bind(CODEX_ACTOR_ID, now),
  ];

  const initialAdminEmail = getInitialAdminEmail();
  if (initialAdminEmail) {
    bootstrapStatements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO users (
            id, email, full_name, account_type, role, status, profile_complete,
            created_by, updated_by, created_at, updated_at
          ) VALUES (
            'initial-owner-admin', ?, 'Administrador proprietário', 'human',
            'admin', 'active', 0, ?, ?, ?, ?
          )`,
        )
        .bind(initialAdminEmail, CODEX_ACTOR_ID, CODEX_ACTOR_ID, now, now),
      db
        .prepare(
          `INSERT INTO audit_logs (actor_user_id, target_user_id, action, details_json, created_at)
           SELECT ?, 'initial-owner-admin', 'user.owner_reserved', '{"loginEnabled":true}', ?
           WHERE EXISTS (SELECT 1 FROM users WHERE id = 'initial-owner-admin')
             AND NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'user.owner_reserved')`,
        )
        .bind(CODEX_ACTOR_ID, now),
    );
  }

  await db.batch(bootstrapStatements);
  await db.prepare('PRAGMA optimize').run();
}
