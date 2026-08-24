import 'server-only';

import { redirect } from 'next/navigation';
import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
import { CODEX_ACTOR_ID, ensureSchema, getD1, getInitialAdminEmail } from '@/db';
import type {
  AccountStatus,
  AccountType,
  AccessInvite,
  AccessInviteStatus,
  AppRole,
  AppUser,
  AcademicContentItem,
  BillingPlan,
  BillingProfile,
  EducatorVerificationStatus,
  PaymentMethod,
  ProfessionalType,
  QuestionCuration,
  QuestionVisibilityStatus,
  SafeUser,
  SocialLinks,
  TeacherSchool,
} from './user-types';

type UserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  phone: string;
  education_level: string;
  account_type: AccountType;
  role: AppRole;
  status: AccountStatus;
  status_reason: string | null;
  suspended_until: number | null;
  professional_type: ProfessionalType;
  educator_verification_status: EducatorVerificationStatus;
  institutional_email: string | null;
  functional_id: string | null;
  cpf: string | null;
  profile_complete: number;
  avatar_key: string | null;
  lattes_url: string | null;
  orcid: string | null;
  social_links_json: string;
  address_postal_code: string;
  address_street: string;
  address_number: string;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string;
  address_state: string;
  address_country: string;
  privacy_accepted_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type TeacherSchoolRow = {
  id: string;
  user_id: string;
  name: string;
  city: string | null;
  state: string | null;
  institutional_email: string | null;
  functional_id: string | null;
  logo_key: string | null;
  header_title: string;
  header_subtitle: string;
  footer_text: string;
  is_active: number;
  created_at: number;
  updated_at: number;
};

type BillingRow = {
  user_id: string;
  payer_type: 'individual' | 'company';
  legal_name: string;
  document_type: 'cpf' | 'cnpj' | 'other';
  document_number: string | null;
  company_name: string | null;
  billing_email: string;
  billing_phone: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  country: string;
  plan_code: string;
  subscription_status: string;
  updated_at: number;
};

type BillingPlanRow = {
  id: string;
  code: string;
  name: string;
  license_type: string;
  billing_cycle: string;
  price_cents: number;
  currency: string;
  max_users: number;
  features_json: string;
  status: 'active' | 'inactive';
  created_at: number;
  updated_at: number;
};

type PaymentMethodRow = {
  id: string;
  name: string;
  method_type: string;
  provider: string;
  instructions_json: string;
  status: 'active' | 'inactive';
  created_at: number;
  updated_at: number;
};

type AcademicContentRow = {
  id: string;
  title: string;
  kind: string;
  institution: string;
  topic: string;
  edition: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  owner_user_id: string | null;
  source_reference: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

type QuestionCurationRow = {
  question_id: number;
  visibility_status: QuestionVisibilityStatus;
  institution: string | null;
  institution_name: string | null;
  edition: string | null;
  phase: string | null;
  year: number | null;
  number: number | null;
  topic: string | null;
  level: string | null;
  title: string | null;
  statement_text: string | null;
  options_json: string;
  answer: number | null;
  answer_label: string | null;
  question_status: string | null;
  video: string | null;
  script_status: string | null;
  source_page: number | null;
  source_file: string | null;
  source_image: string | null;
  essential_figure: number | null;
  bncc_codes_json: string;
  notes: string | null;
  updated_by: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type AccessInviteRow = {
  id: string;
  code: string;
  email: string | null;
  role: AppRole;
  professional_type: ProfessionalType;
  license_type: string;
  max_uses: number;
  used_count: number;
  expires_at: number | null;
  status: AccessInviteStatus;
  notes: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
};

export class ApiAccessError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const OWNER_EMAIL = 'welber05@gmail.com';
const OWNER_PASSWORD_HASH =
  'pbkdf2:SHA-256:120000:b60d343a10ed1f4b8c924f0eef2bce0b:65f7e32e724379e1cc323dc366aa1b8dc63ef9386f17f8629fdc24e3949f6924';
const OWNER_SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/welbermerlincardoso/',
  youtube: 'https://www.youtube.com/@WelberMerlinCardoso',
  linkedin: 'https://www.linkedin.com/in/welbermcardoso/',
  facebook: 'https://www.facebook.com/welber05',
  x: 'https://x.com/welber05',
};

export function isOwnerEmail(email: string) {
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

export async function getOrCreateUser(identity: ChatGPTUser): Promise<AppUser> {
  await ensureSchema();
  const db = getD1();
  const normalizedEmail = identity.email.trim().toLowerCase();

  if (identity.userId.startsWith('local:')) {
    const localUserId = identity.userId.slice('local:'.length);
    const localRow = await db
      .prepare("SELECT * FROM users WHERE account_type = 'human' AND id = ? AND email = ? AND deleted_at IS NULL LIMIT 1")
      .bind(localUserId, normalizedEmail)
      .first<UserRow>();
    if (!localRow) throw new ApiAccessError(401, 'Sessão local inválida. Entre novamente.');
    if (isOwnerEmail(localRow.email)) {
      const owner = await repairOwnerUserRow(db, localRow, null);
      return mapUser(owner);
    }
    return mapUser(localRow);
  }

  if (isOwnerEmail(normalizedEmail)) {
    const owner = await getOrCreateOwnerUser(db, identity);
    return mapUser(owner);
  }

  let row = await db
    .prepare("SELECT * FROM users WHERE account_type = 'human' AND auth_user_id = ? AND deleted_at IS NULL LIMIT 1")
    .bind(identity.userId)
    .first<UserRow>();

  if (!row) {
    row = await db
      .prepare("SELECT * FROM users WHERE account_type = 'human' AND email = ? AND deleted_at IS NULL LIMIT 1")
      .bind(normalizedEmail)
      .first<UserRow>();

    if (row) {
      if (row.auth_user_id && row.auth_user_id !== identity.userId && !row.auth_user_id.startsWith('local:')) {
        throw new ApiAccessError(409, 'Este e-mail já está vinculado a outra identidade.');
      }
      await db
        .prepare("UPDATE users SET auth_user_id = ?, updated_at = ? WHERE id = ? AND (auth_user_id IS NULL OR auth_user_id LIKE 'local:%')")
        .bind(identity.userId, Date.now(), row.id)
        .run();
      row.auth_user_id = identity.userId;
    }
  }

  if (!row) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const fullName = identity.fullName ?? '';
    const initialAdminEmail = getInitialAdminEmail();
    const canBootstrapAdmin = initialAdminEmail
      ? normalizedEmail === initialAdminEmail
      : process.env.NODE_ENV !== 'production' && identity.userId === 'local-preview-admin';
    await db
      .prepare(
        `INSERT INTO users (
          id, auth_user_id, email, full_name, role, status,
          created_by, updated_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          CASE WHEN ? = 1 AND NOT EXISTS (
            SELECT 1 FROM users
            WHERE account_type = 'human' AND role = 'admin' AND deleted_at IS NULL
          ) THEN 'admin' ELSE 'user' END,
          'active', ?, ?, ?, ?
        )`,
      )
      .bind(id, identity.userId, normalizedEmail, fullName, canBootstrapAdmin ? 1 : 0, id, id, now, now)
      .run();
    row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
    await writeAudit(CODEX_ACTOR_ID, id, 'user.bootstrap', { role: row?.role ?? 'user' });
  }

  if (!row) throw new Error('Não foi possível carregar o cadastro do usuário.');

  if (row.status === 'suspended' && row.suspended_until && row.suspended_until <= Date.now()) {
    const now = Date.now();
    await db
      .prepare(
        `UPDATE users SET status = 'active', status_reason = NULL,
          suspended_until = NULL, updated_at = ?
         WHERE id = ? AND status = 'suspended'
           AND suspended_until IS NOT NULL AND suspended_until <= ?`,
      )
      .bind(now, row.id, now)
      .run();
    const refreshed = await db.prepare('SELECT * FROM users WHERE id = ?').bind(row.id).first<UserRow>();
    if (!refreshed) throw new Error('Não foi possível atualizar o estado da conta.');
    row = refreshed;
  }

  return mapUser(row);
}

async function getOrCreateOwnerUser(db: D1Database, identity: ChatGPTUser): Promise<UserRow> {
  const normalizedEmail = identity.email.trim().toLowerCase();
  const now = Date.now();
  let row = await db
    .prepare("SELECT * FROM users WHERE account_type = 'human' AND email = ? LIMIT 1")
    .bind(normalizedEmail)
    .first<UserRow>();

  if (!row) {
    row = await db
      .prepare("SELECT * FROM users WHERE account_type = 'human' AND auth_user_id = ? AND deleted_at IS NULL LIMIT 1")
      .bind(identity.userId)
      .first<UserRow>();
  }

  if (row) {
    await db
      .prepare("UPDATE users SET auth_user_id = NULL, updated_by = ?, updated_at = ? WHERE auth_user_id = ? AND id <> ?")
      .bind(CODEX_ACTOR_ID, now, identity.userId, row.id)
      .run();
    return repairOwnerUserRow(db, row, identity);
  }

  const id = 'owner-welber-admin';
  await db
    .prepare("UPDATE users SET auth_user_id = NULL, updated_by = ?, updated_at = ? WHERE auth_user_id = ?")
    .bind(CODEX_ACTOR_ID, now, identity.userId)
    .run();
  await db
    .prepare(
      `INSERT INTO users (
        id, auth_user_id, email, full_name, phone, education_level, account_type,
        role, status, professional_type, educator_verification_status,
        institutional_email, functional_id, cpf, password_hash,
        profile_complete, privacy_accepted_at,
        lattes_url, orcid, social_links_json,
        address_postal_code, address_street, address_number,
        address_complement, address_neighborhood, address_city,
        address_state, address_country,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '+5527997886378', 'professor', 'human', 'admin', 'active',
        'education_professional', 'approved',
        'welber.mcardoso@educador.edu.es.gov.br', '3682609', '08410974703', ?,
        1, ?,
        'http://lattes.cnpq.br/5720432646721315', '0000-0001-8755-9859', ?,
        '29830000', 'Rua P', '393', 'casa', 'Aeroporto', 'Nova Venécia',
        'Espírito Santo', 'Brasil', ?, ?, ?, ?)`,
    )
    .bind(
      id,
      identity.userId,
      normalizedEmail,
      identity.fullName ?? 'Welber Merlin Cardoso',
      OWNER_PASSWORD_HASH,
      now,
      JSON.stringify(OWNER_SOCIAL_LINKS),
      CODEX_ACTOR_ID,
      CODEX_ACTOR_ID,
      now,
      now,
    )
    .run();
  const created = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  if (!created) throw new Error('Não foi possível criar o administrador proprietário.');
  await writeAudit(CODEX_ACTOR_ID, created.id, 'user.owner_welber_reserved', {
    email: OWNER_EMAIL,
    role: 'admin',
    status: 'active',
  });
  return created;
}

async function repairOwnerUserRow(db: D1Database, row: UserRow, identity: ChatGPTUser | null): Promise<UserRow> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE users SET
        auth_user_id = COALESCE(?, auth_user_id),
        email = ?,
        full_name = ?,
        phone = '+5527997886378',
        education_level = 'professor',
        role = 'admin',
        status = 'active',
        status_reason = NULL,
        suspended_until = NULL,
        professional_type = 'education_professional',
        educator_verification_status = 'approved',
        institutional_email = 'welber.mcardoso@educador.edu.es.gov.br',
        functional_id = '3682609',
        cpf = '08410974703',
        password_hash = ?,
        profile_complete = 1,
        privacy_accepted_at = COALESCE(privacy_accepted_at, ?),
        lattes_url = 'http://lattes.cnpq.br/5720432646721315',
        orcid = '0000-0001-8755-9859',
        social_links_json = ?,
        address_postal_code = '29830000',
        address_street = 'Rua P',
        address_number = '393',
        address_complement = 'casa',
        address_neighborhood = 'Aeroporto',
        address_city = 'Nova Venécia',
        address_state = 'Espírito Santo',
        address_country = 'Brasil',
        deleted_at = NULL,
        updated_by = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      identity?.userId ?? null,
      OWNER_EMAIL,
      identity?.fullName ?? 'Welber Merlin Cardoso',
      OWNER_PASSWORD_HASH,
      now,
      JSON.stringify(OWNER_SOCIAL_LINKS),
      CODEX_ACTOR_ID,
      now,
      row.id,
    )
    .run();
  const refreshed = await db.prepare('SELECT * FROM users WHERE id = ?').bind(row.id).first<UserRow>();
  if (!refreshed) throw new Error('Não foi possível recarregar o administrador proprietário.');
  return refreshed;
}

export async function requirePageUser(
  returnTo: string,
  options: { roles?: AppRole[]; allowIncomplete?: boolean; allowRestricted?: boolean } = {},
) {
  const identity = await requireChatGPTUser(returnTo);
  const user = await getOrCreateUser(identity);

  if (user.accountType === 'system') redirect('/acesso?status=blocked');
  if (!options.allowRestricted && user.status !== 'active') redirect(`/acesso?status=${user.status}`);
  if (!options.allowIncomplete && !user.profileComplete) redirect('/cadastro');
  if (options.roles && !options.roles.includes(user.role)) redirect('/');
  return { identity, user };
}

export async function requireApiUser(
  options: { roles?: AppRole[]; allowIncomplete?: boolean } = {},
) {
  const identity = await getChatGPTUser();
  if (!identity) throw new ApiAccessError(401, 'Autenticação necessária.');
  const user = await getOrCreateUser(identity);
  if (user.accountType === 'system') {
    throw new ApiAccessError(403, 'Contas técnicas não podem iniciar sessão.');
  }
  if (user.status !== 'active') throw new ApiAccessError(403, `Conta ${user.status}.`);
  if (!options.allowIncomplete && !user.profileComplete) {
    throw new ApiAccessError(409, 'Complete o cadastro para continuar.');
  }
  if (options.roles && !options.roles.includes(user.role)) {
    throw new ApiAccessError(403, 'Você não tem permissão para esta ação.');
  }
  return { identity, user };
}

export async function listUsers(): Promise<AppUser[]> {
  await ensureSchema();
  const result = await getD1()
    .prepare("SELECT * FROM users WHERE deleted_at IS NULL ORDER BY account_type = 'system' DESC, created_at DESC LIMIT 500")
    .all<UserRow>();
  return result.results.map(mapUser);
}

export async function getUserById(id: string) {
  await ensureSchema();
  const row = await getD1()
    .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(id)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function getBillingProfile(userId: string): Promise<BillingProfile> {
  await ensureSchema();
  const row = await getD1()
    .prepare('SELECT * FROM billing_profiles WHERE user_id = ?')
    .bind(userId)
    .first<BillingRow>();
  if (row) return mapBilling(row);
  return {
    userId,
    payerType: 'individual',
    legalName: '',
    documentType: 'cpf',
    documentNumber: '',
    companyName: '',
    billingEmail: '',
    billingPhone: '',
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    planCode: 'gratuito',
    subscriptionStatus: 'sem_assinatura',
    updatedAt: 0,
  };
}

export async function listBillingProfiles() {
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `SELECT b.*, u.full_name, u.email, u.role, u.status
       FROM billing_profiles b JOIN users u ON u.id = b.user_id
       WHERE u.deleted_at IS NULL ORDER BY b.updated_at DESC LIMIT 500`,
    )
    .all<BillingRow & { full_name: string; email: string; role: AppRole; status: AccountStatus }>();
  return result.results.map((row) => ({
    ...mapBilling(row),
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
  }));
}

export async function listTeacherSchools(userId: string): Promise<TeacherSchool[]> {
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `SELECT * FROM teacher_schools
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY is_active DESC, updated_at DESC`,
    )
    .bind(userId)
    .all<TeacherSchoolRow>();
  return result.results.map(mapTeacherSchool);
}

export async function listBillingPlans(): Promise<BillingPlan[]> {
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `SELECT * FROM billing_plans
       WHERE deleted_at IS NULL
       ORDER BY status = 'active' DESC, updated_at DESC`,
    )
    .all<BillingPlanRow>();
  return result.results.map(mapBillingPlan);
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `SELECT * FROM payment_methods
       WHERE deleted_at IS NULL
       ORDER BY status = 'active' DESC, updated_at DESC`,
    )
    .all<PaymentMethodRow>();
  return result.results.map(mapPaymentMethod);
}

export async function listAcademicContentItems(): Promise<AcademicContentItem[]> {
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `SELECT * FROM academic_content_items
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC`,
    )
    .all<AcademicContentRow>();
  return result.results.map(mapAcademicContent);
}

export async function listQuestionCurations(): Promise<QuestionCuration[]> {
  await ensureSchema();
  const result = await getD1()
    .prepare('SELECT * FROM question_curations ORDER BY updated_at DESC')
    .all<QuestionCurationRow>();
  return result.results.map(mapQuestionCuration);
}

export async function listAccessInvites(): Promise<AccessInvite[]> {
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `SELECT * FROM access_invites
       WHERE deleted_at IS NULL
       ORDER BY status = 'active' DESC, updated_at DESC
       LIMIT 500`,
    )
    .all<AccessInviteRow>();
  return result.results.map(mapAccessInvite);
}

export async function validateAndApplyInvite(user: AppUser, rawCode: unknown) {
  await ensureSchema();
  const code = normalizeInviteCode(rawCode);
  if (!code) throw new ApiAccessError(400, 'Informe um código de acesso válido.');
  const db = getD1();
  const invite = await db
    .prepare('SELECT * FROM access_invites WHERE code = ? AND deleted_at IS NULL LIMIT 1')
    .bind(code)
    .first<AccessInviteRow>();
  if (!invite) throw new ApiAccessError(404, 'Código de acesso não encontrado.');
  if (invite.status !== 'active') throw new ApiAccessError(403, 'Este código de acesso não está ativo.');
  if (invite.expires_at && invite.expires_at <= Date.now()) {
    await db.prepare("UPDATE access_invites SET status = 'expired', updated_at = ? WHERE id = ?")
      .bind(Date.now(), invite.id)
      .run();
    throw new ApiAccessError(403, 'Este código de acesso expirou.');
  }
  if (invite.used_count >= invite.max_uses) {
    await db.prepare("UPDATE access_invites SET status = 'exhausted', updated_at = ? WHERE id = ?")
      .bind(Date.now(), invite.id)
      .run();
    throw new ApiAccessError(403, 'Este código de acesso já atingiu o limite de uso.');
  }
  const invitedEmail = invite.email?.trim().toLowerCase();
  if (invitedEmail && invitedEmail !== user.email) {
    throw new ApiAccessError(403, 'Este código de acesso foi emitido para outro e-mail.');
  }

  const now = Date.now();
  const nextUsedCount = invite.used_count + 1;
  const nextStatus: AccessInviteStatus = nextUsedCount >= invite.max_uses ? 'exhausted' : 'active';
  const nextProfessionalType = invite.role === 'user' ? 'student' : invite.professional_type;
  const nextEducatorStatus = nextProfessionalType === 'student' ? 'not_requested' : 'approved';
  await db.batch([
    db
      .prepare(
        `UPDATE users SET role = ?, professional_type = ?,
          educator_verification_status = ?, updated_by = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(invite.role, nextProfessionalType, nextEducatorStatus, CODEX_ACTOR_ID, now, user.id),
    db
      .prepare('UPDATE access_invites SET used_count = ?, status = ?, updated_at = ? WHERE id = ?')
      .bind(nextUsedCount, nextStatus, now, invite.id),
  ]);
  await writeAudit(CODEX_ACTOR_ID, user.id, 'invite.redeemed', {
    inviteId: invite.id,
    role: invite.role,
    licenseType: invite.license_type,
  });
}

export async function dashboardMetrics() {
  await ensureSchema();
  const db = getD1();
  const [users, active, staff, restricted, billing] = await db.batch([
    db.prepare("SELECT COUNT(*) AS total FROM users WHERE account_type = 'human' AND deleted_at IS NULL"),
    db.prepare("SELECT COUNT(*) AS total FROM users WHERE account_type = 'human' AND status = 'active' AND deleted_at IS NULL"),
    db.prepare("SELECT COUNT(*) AS total FROM users WHERE account_type = 'human' AND role != 'user' AND deleted_at IS NULL"),
    db.prepare("SELECT COUNT(*) AS total FROM users WHERE account_type = 'human' AND status IN ('blocked','suspended') AND deleted_at IS NULL"),
    db.prepare('SELECT COUNT(*) AS total FROM billing_profiles'),
  ]);
  const total = (result: D1Result) =>
    Number((result.results[0] as { total?: number } | undefined)?.total ?? 0);
  return {
    users: total(users),
    active: total(active),
    staff: total(staff),
    restricted: total(restricted),
    billing: total(billing),
  };
}

export async function recentAuditLogs(limit = 12) {
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `SELECT a.id, a.action, a.created_at,
              actor.full_name AS actor_name, target.full_name AS target_name
       FROM audit_logs a
       LEFT JOIN users actor ON actor.id = a.actor_user_id
       LEFT JOIN users target ON target.id = a.target_user_id
       ORDER BY a.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: number;
      action: string;
      created_at: number;
      actor_name: string | null;
      target_name: string | null;
    }>();
  return result.results.map((row) => ({
    id: row.id,
    action: row.action,
    actorName: row.actor_name ?? 'Sistema',
    targetName: row.target_name ?? '—',
    createdAt: row.created_at,
  }));
}

export async function writeAudit(
  actorUserId: string | null,
  targetUserId: string | null,
  action: string,
  details: Record<string, unknown> = {},
) {
  await ensureSchema();
  await getD1()
    .prepare(
      `INSERT INTO audit_logs (actor_user_id, target_user_id, action, details_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(actorUserId, targetUserId, action, JSON.stringify(details), Date.now())
    .run();
}

export function canManageTarget(actor: AppUser, target: AppUser, nextRole?: AppRole) {
  if (actor.id === target.id) return false;
  if (target.accountType === 'system') return false;
  if (actor.role === 'admin') return true;
  if (actor.role !== 'manager') return false;
  if (['admin', 'manager'].includes(target.role)) return false;
  if (nextRole && ['admin', 'manager'].includes(nextRole)) return false;
  return true;
}

export function safeUser(user: AppUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    educationLevel: user.educationLevel,
    accountType: user.accountType,
    role: user.role,
    status: user.status,
    statusReason: user.statusReason,
    suspendedUntil: user.suspendedUntil,
    professionalType: user.professionalType,
    educatorVerificationStatus: user.educatorVerificationStatus,
    institutionalEmail: user.institutionalEmail,
    functionalId: user.functionalId,
    cpf: user.cpf,
    profileComplete: user.profileComplete,
    avatarUrl: user.avatarKey ? `/api/avatar/${user.id}` : null,
    lattesUrl: user.lattesUrl,
    orcid: user.orcid,
    socialLinks: user.socialLinks,
    address: user.address,
    privacyAcceptedAt: user.privacyAcceptedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function mapUser(row: UserRow): AppUser {
  let socialLinks: SocialLinks = {};
  try {
    socialLinks = JSON.parse(row.social_links_json || '{}') as SocialLinks;
  } catch {
    socialLinks = {};
  }
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    educationLevel: row.education_level,
    accountType: row.account_type ?? 'human',
    role: row.role,
    status: row.status,
    statusReason: row.status_reason,
    suspendedUntil: row.suspended_until,
    professionalType: row.professional_type ?? 'student',
    educatorVerificationStatus: row.educator_verification_status ?? 'not_requested',
    institutionalEmail: row.institutional_email,
    functionalId: row.functional_id,
    cpf: row.cpf,
    profileComplete: Boolean(row.profile_complete),
    avatarKey: row.avatar_key,
    lattesUrl: row.lattes_url,
    orcid: row.orcid,
    socialLinks,
    address: {
      postalCode: row.address_postal_code,
      street: row.address_street,
      number: row.address_number,
      complement: row.address_complement ?? '',
      neighborhood: row.address_neighborhood ?? '',
      city: row.address_city,
      state: row.address_state,
      country: row.address_country,
    },
    privacyAcceptedAt: row.privacy_accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapTeacherSchool(row: TeacherSchoolRow): TeacherSchool {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    city: row.city ?? '',
    state: row.state ?? '',
    institutionalEmail: row.institutional_email ?? '',
    functionalId: row.functional_id ?? '',
    logoUrl: row.logo_key ? `/api/schools/${row.id}/logo` : null,
    headerTitle: row.header_title,
    headerSubtitle: row.header_subtitle,
    footerText: row.footer_text,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBillingPlan(row: BillingPlanRow): BillingPlan {
  let features: string[] = [];
  try {
    features = JSON.parse(row.features_json || '[]') as string[];
  } catch {
    features = [];
  }
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    licenseType: row.license_type,
    billingCycle: row.billing_cycle,
    priceCents: row.price_cents,
    currency: row.currency,
    maxUsers: row.max_users,
    features,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  let instructions: Record<string, string> = {};
  try {
    instructions = JSON.parse(row.instructions_json || '{}') as Record<string, string>;
  } catch {
    instructions = {};
  }
  return {
    id: row.id,
    name: row.name,
    methodType: row.method_type,
    provider: row.provider,
    instructions,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAcademicContent(row: AcademicContentRow): AcademicContentItem {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    institution: row.institution,
    topic: row.topic,
    edition: row.edition,
    status: row.status,
    ownerUserId: row.owner_user_id,
    sourceReference: row.source_reference ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuestionCuration(row: QuestionCurationRow): QuestionCuration {
  let options: string[] = [];
  let bnccCodes: string[] = [];
  try {
    options = JSON.parse(row.options_json || '[]') as string[];
  } catch {
    options = [];
  }
  try {
    bnccCodes = JSON.parse(row.bncc_codes_json || '[]') as string[];
  } catch {
    bnccCodes = [];
  }
  return {
    questionId: row.question_id,
    visibilityStatus: row.visibility_status,
    institution: row.institution ?? '',
    institutionName: row.institution_name ?? '',
    edition: row.edition ?? '',
    phase: row.phase ?? '',
    year: row.year,
    number: row.number,
    topic: row.topic ?? '',
    level: row.level ?? '',
    title: row.title ?? '',
    text: row.statement_text ?? '',
    options,
    answer: row.answer,
    answerLabel: row.answer_label ?? '',
    questionStatus: row.question_status ?? '',
    video: row.video ?? '',
    scriptStatus: row.script_status ?? '',
    sourcePage: row.source_page,
    sourceFile: row.source_file ?? '',
    sourceImage: row.source_image ?? '',
    essentialFigure: row.essential_figure === null ? null : Boolean(row.essential_figure),
    bnccCodes,
    notes: row.notes ?? '',
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapAccessInvite(row: AccessInviteRow): AccessInvite {
  return {
    id: row.id,
    code: row.code,
    email: row.email ?? '',
    role: row.role,
    professionalType: row.professional_type,
    licenseType: row.license_type,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
    status: row.status,
    notes: row.notes ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBilling(row: BillingRow): BillingProfile {
  return {
    userId: row.user_id,
    payerType: row.payer_type,
    legalName: row.legal_name,
    documentType: row.document_type,
    documentNumber: row.document_number ?? '',
    companyName: row.company_name ?? '',
    billingEmail: row.billing_email,
    billingPhone: row.billing_phone,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement ?? '',
    neighborhood: row.neighborhood ?? '',
    city: row.city,
    state: row.state,
    country: row.country,
    planCode: row.plan_code,
    subscriptionStatus: row.subscription_status,
    updatedAt: row.updated_at,
  };
}

export function normalizeInviteCode(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}
