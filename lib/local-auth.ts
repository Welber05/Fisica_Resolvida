import 'server-only';

import { ensureSchema, getD1 } from '@/db';
import { ApiAccessError } from '@/lib/user-service';

export const LOCAL_SESSION_COOKIE = 'fr_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const HASH_ITERATIONS = 120_000;
const HASH_ALGORITHM = 'SHA-256';

type LoginUserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  status: string;
  role: string;
  profile_complete: number;
  password_hash: string | null;
  deleted_at: number | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  revoked_at: number | null;
  email: string;
  full_name: string;
};

export async function createPasswordHash(password: string) {
  assertPassword(password);
  const salt = randomHex(16);
  const hash = await pbkdf2(password, salt);
  return `pbkdf2:${HASH_ALGORITHM}:${HASH_ITERATIONS}:${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [kind, algorithm, iterationsText, salt, hash] = storedHash.split(':');
  if (kind !== 'pbkdf2' || algorithm !== HASH_ALGORITHM || !salt || !hash) return false;
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100_000) return false;
  const candidate = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(candidate, hash);
}

export async function createLocalSession(email: string, password: string) {
  await ensureSchema();
  const normalizedEmail = email.trim().toLowerCase();
  const row = await getD1()
    .prepare(
      `SELECT id, auth_user_id, email, full_name, status, role, profile_complete, password_hash, deleted_at
       FROM users
       WHERE account_type = 'human' AND email = ? AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(normalizedEmail)
    .first<LoginUserRow>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new ApiAccessError(401, 'E-mail ou senha inválidos.');
  }
  if (row.status !== 'active') throw new ApiAccessError(403, `Conta ${row.status}.`);
  const session = await persistSession(row.id);
  return {
    cookieValue: session.cookieValue,
    expiresAt: session.expiresAt,
    returnTo: row.profile_complete
      ? ['manager', 'admin'].includes(row.role)
        ? '/painel'
        : '/acervo'
      : '/cadastro',
  };
}

export async function getLocalSessionIdentity(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  const [id, secret] = cookieValue.split('.');
  if (!id || !secret) return null;
  await ensureSchema();
  const row = await getD1()
    .prepare(
      `SELECT s.id, s.user_id, s.token_hash, s.expires_at, s.revoked_at,
              u.email, u.full_name
       FROM local_auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND u.deleted_at IS NULL AND u.status = 'active'
       LIMIT 1`,
    )
    .bind(id)
    .first<SessionRow>();
  if (!row || row.revoked_at || row.expires_at <= Date.now()) return null;
  const tokenHash = await sha256Hex(secret);
  if (!timingSafeEqual(tokenHash, row.token_hash)) return null;
  await getD1()
    .prepare('UPDATE local_auth_sessions SET last_seen_at = ? WHERE id = ?')
    .bind(Date.now(), id)
    .run();
  return {
    userId: `local:${row.user_id}`,
    displayName: row.full_name || row.email,
    email: row.email,
    fullName: row.full_name || null,
  };
}

export async function revokeLocalSession(cookieValue: string | undefined) {
  const id = cookieValue?.split('.')[0];
  if (!id) return;
  await ensureSchema();
  await getD1()
    .prepare('UPDATE local_auth_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
    .bind(Date.now(), id)
    .run();
}

export function assertPassword(password: string) {
  if (password.length < 8) {
    throw new ApiAccessError(400, 'A senha deve ter pelo menos 8 caracteres.');
  }
  if (password.length > 128) {
    throw new ApiAccessError(400, 'A senha é muito longa.');
  }
}

async function persistSession(userId: string) {
  const id = crypto.randomUUID();
  const secret = randomHex(32);
  const tokenHash = await sha256Hex(secret);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await getD1()
    .prepare(
      `INSERT INTO local_auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, tokenHash, expiresAt, now, now)
    .run();
  return { cookieValue: `${id}.${secret}`, expiresAt };
}

async function pbkdf2(password: string, salt: string, iterations = HASH_ITERATIONS) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: HASH_ALGORITHM, salt: encoder.encode(salt), iterations },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return bytesToHex(values);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}
