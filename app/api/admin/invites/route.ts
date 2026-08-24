import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import {
  ApiAccessError,
  listAccessInvites,
  requireApiUser,
  writeAudit,
} from '@/lib/user-service';
import { validateInvitePayload } from '@/lib/invite-validation';
import { assertSameOrigin, jsonError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireApiUser({ roles: ['admin', 'manager'] });
    return NextResponse.json({ invites: await listAccessInvites() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user: actor } = await requireApiUser({ roles: ['admin', 'manager'] });
    const payload = validateInvitePayload(await request.json(), actor.role);
    const db = getD1();
    const existing = await db
      .prepare('SELECT id FROM access_invites WHERE code = ? AND deleted_at IS NULL')
      .bind(payload.code)
      .first<{ id: string }>();
    if (existing) throw new ApiAccessError(409, 'Já existe um convite com este código.');

    const id = crypto.randomUUID();
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO access_invites (
          id, code, email, role, professional_type, license_type,
          max_uses, used_count, expires_at, status, notes,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?, ?, ?, ?)`,
      )
      .bind(
        id,
        payload.code,
        payload.email || null,
        payload.role,
        payload.professionalType,
        payload.licenseType,
        payload.maxUses,
        payload.expiresAt,
        payload.notes,
        actor.id,
        now,
        now,
      )
      .run();
    await writeAudit(actor.id, null, 'invite.created', { inviteId: id, role: payload.role });
    return NextResponse.json({ invites: await listAccessInvites() }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
