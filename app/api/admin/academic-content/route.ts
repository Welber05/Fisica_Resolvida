import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { listAcademicContentItems, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireApiUser({ roles: ['admin', 'manager', 'professor'] });
    return NextResponse.json({ items: await listAcademicContentItems() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager', 'professor'] });
    const item = validateAcademicContent(await request.json());
    const now = Date.now();
    const id = crypto.randomUUID();
    await getD1()
      .prepare(
        `INSERT INTO academic_content_items
          (id, title, kind, institution, topic, edition, status, owner_user_id, source_reference, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        item.title,
        item.kind,
        item.institution,
        item.topic,
        item.edition,
        item.status,
        user.id,
        item.sourceReference,
        item.notes,
        now,
        now,
      )
      .run();
    await writeAudit(user.id, id, 'academic_content.created', { kind: item.kind });
    return NextResponse.json({ items: await listAcademicContentItems() }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

function validateAcademicContent(value: unknown) {
  const input = objectValue(value);
  const status = text(input.status || 'draft', 'status', 2, 20) as 'draft' | 'review' | 'published' | 'archived';
  if (!['draft', 'review', 'published', 'archived'].includes(status)) {
    throw new ValidationError('Status de conteúdo inválido.');
  }
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
