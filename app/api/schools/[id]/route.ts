import { NextResponse } from 'next/server';
import { ensureSchema, getD1, getFilesBucket } from '@/db';
import { listTeacherSchools, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const professionalRoles = new Set(['professor', 'manager', 'admin']);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const { user } = await requireApiUser();
    if (!professionalRoles.has(user.role)) {
      throw new ValidationError('A personalização de documentos está disponível para professores e gestores.');
    }
    const body = (await request.json()) as { isActive?: boolean };
    if (body.isActive !== true) throw new ValidationError('Ação inválida.');
    await ensureSchema();
    const db = getD1();
    const existing = await db
      .prepare('SELECT id FROM teacher_schools WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .bind(id, user.id)
      .first<{ id: string }>();
    if (!existing) throw new ValidationError('Escola não encontrada.');
    const now = Date.now();
    await db
      .prepare('UPDATE teacher_schools SET is_active = 0, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL')
      .bind(now, user.id)
      .run();
    await db
      .prepare('UPDATE teacher_schools SET is_active = 1, updated_at = ? WHERE id = ? AND user_id = ?')
      .bind(now, id, user.id)
      .run();
    await writeAudit(user.id, user.id, 'school.activated', { schoolId: id });
    return NextResponse.json({ schools: await listTeacherSchools(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const { user } = await requireApiUser();
    if (!professionalRoles.has(user.role)) {
      throw new ValidationError('A personalização de documentos está disponível para professores e gestores.');
    }
    await ensureSchema();
    const db = getD1();
    const existing = await db
      .prepare(
        'SELECT id, logo_key, is_active FROM teacher_schools WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      )
      .bind(id, user.id)
      .first<{ id: string; logo_key: string | null; is_active: number }>();
    if (!existing) throw new ValidationError('Escola não encontrada.');
    const now = Date.now();
    await db
      .prepare('UPDATE teacher_schools SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?')
      .bind(now, now, id, user.id)
      .run();
    if (existing.logo_key) await getFilesBucket().delete(existing.logo_key);
    if (existing.is_active) {
      const next = await db
        .prepare(
          'SELECT id FROM teacher_schools WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1',
        )
        .bind(user.id)
        .first<{ id: string }>();
      if (next) {
        await db
          .prepare('UPDATE teacher_schools SET is_active = 1, updated_at = ? WHERE id = ? AND user_id = ?')
          .bind(now, next.id, user.id)
          .run();
      }
    }
    await writeAudit(user.id, user.id, 'school.deleted', { schoolId: id });
    return NextResponse.json({ schools: await listTeacherSchools(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}
