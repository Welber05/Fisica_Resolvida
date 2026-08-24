import { normalizeInviteCode } from '@/lib/user-service';
import { ValidationError } from '@/lib/validation';
import type { AppRole, ProfessionalType } from '@/lib/user-types';

export function validateInvitePayload(value: unknown, actorRole: AppRole) {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const code = normalizeInviteCode(input.code || generateInviteCode());
  if (code.length < 6 || code.length > 32) {
    throw new ValidationError('O código deve ter entre 6 e 32 caracteres.');
  }
  const email = String(input.email ?? '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Informe um e-mail válido ou deixe em branco para código geral.');
  }
  const role = String(input.role || 'user') as AppRole;
  const allowedRoles: AppRole[] = actorRole === 'admin'
    ? ['user', 'professor', 'manager', 'admin']
    : ['user', 'professor'];
  if (!allowedRoles.includes(role)) throw new ValidationError('Papel não autorizado para este convite.');
  const professionalType = String(
    input.professionalType || (role === 'user' ? 'student' : 'teacher'),
  ) as ProfessionalType;
  if (!['student', 'teacher', 'education_professional'].includes(professionalType)) {
    throw new ValidationError('Classificação profissional inválida.');
  }
  const maxUses = Number(input.maxUses || 1);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500) {
    throw new ValidationError('O limite de usos deve ficar entre 1 e 500.');
  }
  const expiresAtText = String(input.expiresAt || '').trim();
  const expiresAt = expiresAtText ? new Date(expiresAtText).getTime() : null;
  if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) {
    throw new ValidationError('A validade deve ser uma data futura.');
  }
  return {
    code,
    email,
    role,
    professionalType: role === 'user' ? 'student' : professionalType,
    licenseType: String(input.licenseType || 'gratuito').trim().slice(0, 60) || 'gratuito',
    maxUses,
    expiresAt,
    notes: String(input.notes || '').trim().slice(0, 300),
  };
}

function generateInviteCode() {
  return 'FR-' + crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
}
