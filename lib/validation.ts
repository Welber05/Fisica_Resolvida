import { NextResponse } from 'next/server';
import { ApiAccessError } from './user-service';
import {
  educationLevels,
  type AccountStatus,
  type AppRole,
  type ProfessionalType,
  type SocialLinks,
} from './user-types';

export class ValidationError extends Error {}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new ApiAccessError(403, 'Origem da solicitação não autorizada.');
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: 'Não foi possível concluir a solicitação.' }, { status: 500 });
}

export function validateProfilePayload(value: unknown, expectedEmail: string) {
  const input = objectValue(value);
  const email = requiredEmail(input.email);
  if (email !== expectedEmail.trim().toLowerCase()) {
    throw new ValidationError('O e-mail deve ser o mesmo da identidade autenticada.');
  }

  const educationLevel = requiredText(input.educationLevel, 'nível escolar', 2, 40);
  if (!educationLevels.some(([code]) => code === educationLevel)) {
    throw new ValidationError('Selecione um nível escolar válido.');
  }
  const professionalType = requiredProfessionalType(input.professionalType);
  if (!['student', 'teacher', 'education_professional'].includes(professionalType)) {
    throw new ValidationError('Selecione uma classificação profissional válida.');
  }
  const institutionalEmail = optionalLooseEmail(input.institutionalEmail);
  const functionalId = optionalText(input.functionalId, 60);
  const cpf = optionalCpf(input.cpf, true);

  const socialInput = objectValue(input.socialLinks ?? {});
  const socialLinks: SocialLinks = {};
  for (const network of ['instagram', 'youtube', 'linkedin', 'facebook', 'x'] as const) {
    const url = optionalAdminUrl(socialInput[network]);
    if (url) socialLinks[network] = url;
  }

  const lattesUrl = optionalAdminUrl(input.lattesUrl);
  const validLattesUrl = lattesUrl && new URL(lattesUrl).hostname === 'lattes.cnpq.br' ? lattesUrl : '';

  const orcid = optionalText(input.orcid, 30).toUpperCase();
  const validOrcid = orcid && isValidOrcid(orcid) ? orcid : '';

  return {
    fullName: requiredText(input.fullName, 'nome', 3, 120),
    email,
    phone: normalizePhone(input.phone),
    educationLevel,
    professionalType,
    institutionalEmail: professionalType === 'student' ? null : institutionalEmail || null,
    functionalId: professionalType === 'student' ? null : functionalId || null,
    cpf: professionalType === 'student' ? null : cpf || null,
    lattesUrl: validLattesUrl || null,
    orcid: validOrcid || null,
    socialLinks,
    address: {
      postalCode: optionalText(input.addressPostalCode, 12),
      street: optionalText(input.addressStreet, 160),
      number: optionalText(input.addressNumber, 30),
      complement: optionalText(input.addressComplement, 100),
      neighborhood: optionalText(input.addressNeighborhood, 100),
      city: optionalText(input.addressCity, 100),
      state: optionalText(input.addressState, 60),
      country: optionalText(input.addressCountry, 60) || 'Brasil',
    },
  };
}

export function validateBillingPayload(value: unknown) {
  const input = objectValue(value);
  const payerType = String(input.payerType || 'individual');
  if (!['individual', 'company'].includes(payerType)) {
    throw new ValidationError('Tipo de pagador inválido.');
  }
  const documentType = String(input.documentType || (payerType === 'company' ? 'cnpj' : 'cpf'));
  if (!['cpf', 'cnpj', 'other'].includes(documentType)) {
    throw new ValidationError('Tipo de documento inválido.');
  }
  const documentNumber = optionalText(input.documentNumber, 30).replace(/[^0-9A-Za-z]/g, '');
  if (documentNumber && documentNumber.length < 5) {
    throw new ValidationError('Informe um documento de faturamento válido.');
  }
  return {
    payerType: payerType as 'individual' | 'company',
    legalName: requiredText(input.legalName, 'nome ou razão social', 3, 160),
    documentType: documentType as 'cpf' | 'cnpj' | 'other',
    documentNumber: documentNumber || null,
    companyName: optionalText(input.companyName, 160) || null,
    billingEmail: requiredEmail(input.billingEmail),
    billingPhone: normalizePhone(input.billingPhone),
    postalCode: requiredText(input.postalCode, 'CEP de cobrança', 5, 12),
    street: requiredText(input.street, 'logradouro de cobrança', 3, 160),
    number: requiredText(input.number, 'número de cobrança', 1, 30),
    complement: optionalText(input.complement, 100) || null,
    neighborhood: optionalText(input.neighborhood, 100) || null,
    city: requiredText(input.city, 'cidade de cobrança', 2, 100),
    state: requiredText(input.state, 'estado de cobrança', 2, 60),
    country: requiredText(input.country || 'Brasil', 'país de cobrança', 2, 60),
  };
}

export function validateAdminUserPayload(value: unknown, allowedRoles: AppRole[]) {
  const input = objectValue(value);
  const role = String(input.role || 'user') as AppRole;
  if (!allowedRoles.includes(role)) throw new ValidationError('Papel não autorizado.');
  const email = requiredEmail(input.email);
  const educationLevel = requiredText(input.educationLevel, 'nível escolar', 2, 40);
  if (!educationLevels.some(([code]) => code === educationLevel)) {
    throw new ValidationError('Selecione um nível escolar válido.');
  }
  const professionalType = String(input.professionalType || (role === 'user' ? 'student' : 'teacher')) as ProfessionalType;
  if (!['student', 'teacher', 'education_professional'].includes(professionalType)) {
    throw new ValidationError('Selecione uma classificação profissional válida.');
  }
  const socialInput = objectValue(input.socialLinks ?? {});
  const socialLinks: SocialLinks = {};
  for (const network of ['instagram', 'youtube', 'linkedin', 'facebook', 'x'] as const) {
    const url = optionalAdminUrl(socialInput[network]);
    if (url) socialLinks[network] = url;
  }
  const lattesUrl = optionalAdminUrl(input.lattesUrl);
  const validLattesUrl = lattesUrl && new URL(lattesUrl).hostname === 'lattes.cnpq.br' ? lattesUrl : '';
  const orcid = optionalText(input.orcid, 30).toUpperCase();
  const validOrcid = orcid && isValidOrcid(orcid) ? orcid : '';
  return {
    role,
    fullName: requiredText(input.fullName, 'nome', 3, 120),
    email,
    phone: normalizePhone(input.phone),
    educationLevel,
    professionalType: role === 'user' ? 'student' : professionalType,
    institutionalEmail: optionalEmail(input.institutionalEmail, 'e-mail institucional') || null,
    functionalId: optionalText(input.functionalId, 60) || null,
    cpf: optionalCpf(input.cpf, true) || null,
    lattesUrl: validLattesUrl || null,
    orcid: validOrcid || null,
    socialLinks,
    address: {
      postalCode: optionalText(input.addressPostalCode, 12),
      street: optionalText(input.addressStreet, 160),
      number: optionalText(input.addressNumber, 30),
      complement: optionalText(input.addressComplement, 100),
      neighborhood: optionalText(input.addressNeighborhood, 100),
      city: optionalText(input.addressCity, 100),
      state: optionalText(input.addressState, 60),
      country: optionalText(input.addressCountry, 60) || 'Brasil',
    },
  };
}

export function validateStatusPayload(value: unknown) {
  const input = objectValue(value);
  const status = String(input.status) as AccountStatus;
  if (!['active', 'inactive', 'blocked', 'suspended'].includes(status)) {
    throw new ValidationError('Estado da conta inválido.');
  }
  const reason = requiredText(input.reason, 'motivo', 5, 300);
  let suspendedUntil: number | null = null;
  if (status === 'suspended') {
    const date = new Date(String(input.suspendedUntil || ''));
    suspendedUntil = date.getTime();
    if (!Number.isFinite(suspendedUntil) || suspendedUntil <= Date.now()) {
      throw new ValidationError('Informe uma data futura para o término da suspensão.');
    }
  }
  return { status, reason, suspendedUntil };
}

export function validateRole(value: unknown, allowedRoles: AppRole[]) {
  const role = String(value) as AppRole;
  if (!allowedRoles.includes(role)) throw new ValidationError('Papel não autorizado.');
  return role;
}

export function maskDocument(value: string) {
  if (!value) return 'Não informado';
  const clean = value.replace(/\s/g, '');
  return `${'*'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Dados inválidos.');
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, min: number, max: number) {
  const text = String(value ?? '').trim();
  if (text.length < min) throw new ValidationError(`Preencha corretamente o campo ${label}.`);
  if (text.length > max) throw new ValidationError(`O campo ${label} excede o limite permitido.`);
  return text;
}

function optionalText(value: unknown, max: number) {
  const text = String(value ?? '').trim();
  if (text.length > max) throw new ValidationError('Um dos campos excede o limite permitido.');
  return text;
}

function requiredEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Informe um e-mail válido.');
  }
  return email;
}

function requiredProfessionalType(value: unknown) {
  const professionalType = String(value ?? '').trim() as ProfessionalType;
  if (!professionalType) {
    throw new ValidationError('Selecione uma classificação profissional.');
  }
  return professionalType;
}

function optionalEmail(value: unknown, label: string) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError(`Informe um ${label} válido.`);
  }
  return email;
}

function optionalLooseEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function optionalCpf(value: unknown, ignoreInvalid = false) {
  const cpf = String(value ?? '').replace(/\D/g, '');
  if (!cpf) return '';
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    if (ignoreInvalid) return '';
    throw new ValidationError('Informe um CPF válido com 11 dígitos ou deixe em branco.');
  }
  return cpf;
}

function optionalAdminUrl(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizePhone(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new ValidationError('Informe um telefone válido com DDD.');
  }
  return `+${digits}`;
}

function isValidOrcid(value: string) {
  if (!/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/.test(value)) return false;
  const chars = value.replace(/-/g, '').split('');
  const check = chars.pop();
  let total = 0;
  for (const char of chars) total = (total + Number(char)) * 2;
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  return check === (result === 10 ? 'X' : String(result));
}
