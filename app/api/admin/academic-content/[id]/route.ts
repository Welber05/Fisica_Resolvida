import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { listAcademicContentItems, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager', 'professor'] });
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const now = Date.now();
    if (body.operation === 'status') {
      const status = String(body.status || 'draft');
      if (!['draft', 'review', 'published', 'archived'].includes(status)) {
        throw new ValidationError('Status de conteúdo inválido.');
      }
      await getD1()
        .prepare('UPDATE academic_content_items SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
        .bind(status, now, id)
        .run();
      await writeAudit(user.id, id, 'academic_content.status_changed', { status });
    } else {
      const item = validateAcademicContent(body);
      await getD1()
        .prepare(
          `UPDATE academic_content_items SET
            title = ?, kind = ?, institution = ?, topic = ?, edition = ?,
            status = ?, source_reference = ?, notes = ?, updated_at = ?
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .bind(
          item.title,
          item.kind,
          item.institution,
          item.topic,
          item.edition,
          item.status,
          item.sourceReference,
          item.notes,
          now,
          id,
        )
        .run();
      await writeAudit(user.id, id, 'academic_content.updated', { kind: item.kind });
    }
    return NextResponse.json({ items: await listAcademicContentItems() });
  } catch (error) {
    return jsonError(error);
  }
}

function validateAcademicContent(value: unknown) {
  const input = objectValue(value);
  const status = text(input.status || 'draft', 'status', 2, 20) as 'draft' | 'review' | 'published' | 'archived';
  if (!['draft', 'review', 'published', 'archived'].includes(status)) throw new ValidationError('Status de conteúdo inválido.');
  return {
    title: text(input.title, 'título', 3, 180),
    kind: text(input.kind || 'question_set', 'tipo', 2, 50),
    institution: text(input.institution || 'Geral', 'instituição', 2, 50),
    topic: text(input.topic || 'Física geral', 'tema', 2, 80),
    edition: optionalText(input.edition, 80),
    status,
    sourceReference: optionalText(input.sourceReference, 240),
    notes: optionalText(input.notes, 800),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('Dados inválidos.');
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, min: number, max: number) {
  const result = String(value ?? '').trim();
  if (result.length < min) throw new ValidationError(`Preencha corretamente o campo ${label}.`);
  if (result.length > max) throw new ValidationError(`O campo ${label} excede o limite permitido.`);
  return result;
}

function optionalText(value: unknown, max: number) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new ValidationError('Um dos campos excede o limite permitido.');
  return result;
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager', 'professor'] });
    const { id } = await context.params;
    await getD1()
      .prepare('UPDATE academic_content_items SET deleted_at = ?, status = ? WHERE id = ? AND deleted_at IS NULL')
      .bind(Date.now(), 'archived', id)
      .run();
    await writeAudit(user.id, id, 'academic_content.deleted');
    return NextResponse.json({ items: await listAcademicContentItems() });
  } catch (error) {
    return jsonError(error);
  }
}
