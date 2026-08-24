import { NextResponse } from 'next/server';
import { ensureSchema, getD1, getFilesBucket } from '@/db';
import { requireApiUser } from '@/lib/user-service';
import { jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    await ensureSchema();
    const row = await getD1()
      .prepare('SELECT user_id, logo_key FROM teacher_schools WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first<{ user_id: string; logo_key: string | null }>();
    if (!row?.logo_key) throw new ValidationError('Logomarca não encontrada.');
    if (row.user_id !== user.id && !['manager', 'admin'].includes(user.role)) {
      throw new ValidationError('Logomarca não encontrada.');
    }
    const object = await getFilesBucket().get(row.logo_key);
    if (!object) throw new ValidationError('Logomarca não encontrada.');
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('cache-control', 'private, max-age=3600');
    return new NextResponse(object.body, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
