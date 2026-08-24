import { NextResponse } from 'next/server';
import { ensureSchema, getD1, getFilesBucket } from '@/db';
import { listTeacherSchools, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const allowedLogoTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const professionalRoles = new Set(['professor', 'manager', 'admin']);

export async function GET() {
  try {
    const { user } = await requireApiUser();
    if (!professionalRoles.has(user.role)) return NextResponse.json({ schools: [] });
    return NextResponse.json({ schools: await listTeacherSchools(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser();
    if (!professionalRoles.has(user.role)) {
      throw new ValidationError('A personalização de documentos está disponível para professores e gestores.');
    }
    await ensureSchema();
    const form = await request.formData();
    const schoolId = text(form.get('id'), 80) || crypto.randomUUID();
    const name = requiredText(form.get('name'), 'nome da escola', 2, 160);
    const city = text(form.get('city'), 100);
    const state = text(form.get('state'), 60);
    const institutionalEmail = optionalEmail(form.get('institutionalEmail'));
    const functionalId = text(form.get('functionalId'), 60);
    const headerTitle = text(form.get('headerTitle'), 160) || 'Lista de Exercícios';
    const headerSubtitle = text(form.get('headerSubtitle'), 160) || 'Física';
    const footerText = text(form.get('footerText'), 300);
    const wantsActive = form.get('isActive') === 'on' || form.get('isActive') === 'true';
    const now = Date.now();
    const db = getD1();
    const existing = await db
      .prepare('SELECT id, logo_key FROM teacher_schools WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .bind(schoolId, user.id)
      .first<{ id: string; logo_key: string | null }>();
    const count = await db
      .prepare('SELECT COUNT(*) AS total FROM teacher_schools WHERE user_id = ? AND deleted_at IS NULL')
      .bind(user.id)
      .first<{ total: number }>();
    const isActive = wantsActive || (count?.total ?? 0) === 0;
    let logoKey = existing?.logo_key ?? null;
    let oldLogoKey: string | null = null;
    const logo = form.get('logo');
    if (logo instanceof File && logo.size > 0) {
      const extension = allowedLogoTypes.get(logo.type);
      if (!extension) throw new ValidationError('Use uma logomarca JPEG, PNG ou WebP.');
      if (logo.size > 2 * 1024 * 1024) throw new ValidationError('A logomarca deve ter no máximo 2 MB.');
      const bytes = new Uint8Array(await logo.arrayBuffer());
      if (!matchesImageSignature(logo.type, bytes)) {
        throw new ValidationError('O conteúdo da logomarca não corresponde ao formato informado.');
      }
      oldLogoKey = logoKey;
      logoKey = `school-logos/${user.id}/${schoolId}/${crypto.randomUUID()}.${extension}`;
      await getFilesBucket().put(logoKey, bytes, {
        httpMetadata: { contentType: logo.type, cacheControl: 'private, max-age=3600' },
        customMetadata: { owner: user.id, schoolId },
      });
    }
    if (isActive) {
      await db
        .prepare('UPDATE teacher_schools SET is_active = 0, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL')
        .bind(now, user.id)
        .run();
    }
    if (existing) {
      await db
        .prepare(
          `UPDATE teacher_schools SET
            name = ?, city = ?, state = ?, institutional_email = ?, functional_id = ?,
            logo_key = ?, header_title = ?, header_subtitle = ?, footer_text = ?, is_active = ?, updated_at = ?
           WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        )
        .bind(
          name,
          city || null,
          state || null,
          institutionalEmail || null,
          functionalId || null,
          logoKey,
          headerTitle,
          headerSubtitle,
          footerText,
          isActive ? 1 : 0,
          now,
          schoolId,
          user.id,
        )
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO teacher_schools
            (id, user_id, name, city, state, institutional_email, functional_id, logo_key,
             header_title, header_subtitle, footer_text, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          schoolId,
          user.id,
          name,
          city || null,
          state || null,
          institutionalEmail || null,
          functionalId || null,
          logoKey,
          headerTitle,
          headerSubtitle,
          footerText,
          isActive ? 1 : 0,
          now,
          now,
        )
        .run();
    }
    if (oldLogoKey && oldLogoKey !== logoKey) await getFilesBucket().delete(oldLogoKey);
    await writeAudit(user.id, user.id, existing ? 'school.updated' : 'school.created', { schoolId });
    return NextResponse.json({ schools: await listTeacherSchools(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}

function requiredText(value: unknown, label: string, min: number, max: number) {
  const result = text(value, max);
  if (result.length < min) throw new ValidationError(`Preencha corretamente o campo ${label}.`);
  return result;
}

function text(value: unknown, max: number) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new ValidationError('Um dos campos excede o limite permitido.');
  return result;
}

function optionalEmail(value: unknown) {
  const result = text(value, 160).toLowerCase();
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new ValidationError('Informe um e-mail institucional válido.');
  }
  return result;
}

function matchesImageSignature(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  if (type === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}
