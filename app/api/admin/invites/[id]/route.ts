import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import {
  ApiAccessError,
  listAccessInvites,
  requireApiUser,
  writeAudit,
} from '@/lib/user-service';
import { validateInvitePayload } from '@/lib/invite-validation';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';
import type { AccessInviteStatus } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { user: actor } = await requireApiUser({ roles: ['admin', 'manager'] });
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const operation = String(body.operation || 'details');
    const db = getD1();
    const current = await db
      .prepare('SELECT id FROM access_invites WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first<{ id: string }>();
    if (!current) throw new ApiAccessError(404, 'Convite não encontrado.');
    const now = Date.now();

    if (operation === 'details') {
      const payload = validateInvitePayload(body, actor.role);
      await db
        .prepare(
          `UPDATE access_invites SET code = ?, email = ?, role = ?, professional_type = ?,
            license_type = ?, max_uses = ?, expires_at = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          payload.code,
          payload.email || null,
          payload.role,
          payload.professionalType,
          payload.licenseType,
          payload.maxUses,
          payload.expiresAt,
          payload.notes,
          now,
          id,
        )
        .run();
      await writeAudit(actor.id, null, 'invite.updated', { inviteId: id });
    } else if (operation === 'status') {
      const status = String(body.status || '') as AccessInviteStatus;
      if (!['active', 'inactive', 'expired', 'exhausted'].includes(status)) {
        throw new ValidationError('Estado do convite inválido.');
      }
      await db
        .prepare('UPDATE access_invites SET status = ?, updated_at = ? WHERE id = ?')
        .bind(status, now, id)
        .run();
      await writeAudit(actor.id, null, 'invite.status_changed', { inviteId: id, status });
    } else {
      throw new ValidationError('Operação inválida.');
    }

    return NextResponse.json({ invites: await listAccessInvites() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { user: actor } = await requireApiUser({ roles: ['admin', 'manager'] });
    const { id } = await context.params;
    const now = Date.now();
    await getD1()
      .prepare("UPDATE access_invites SET status = 'inactive', deleted_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, id)
      .run();
    await writeAudit(actor.id, null, 'invite.deleted', { inviteId: id });
    return NextResponse.json({ invites: await listAccessInvites() });
  } catch (error) {
    return jsonError(error);
  }
}
