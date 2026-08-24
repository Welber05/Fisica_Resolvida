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
