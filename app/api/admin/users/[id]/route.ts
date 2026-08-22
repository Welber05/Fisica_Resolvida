import { NextResponse } from 'next/server';
import { getD1, getFilesBucket } from '@/db';
import {
  ApiAccessError,
  canManageTarget,
  getUserById,
  requireApiUser,
  safeUser,
  writeAudit,
} from '@/lib/user-service';
import {
  assertSameOrigin,
  jsonError,
  validateProfilePayload,
  validateRole,
  validateStatusPayload,
  ValidationError,
} from '@/lib/validation';
import type { AppRole } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { user: actor } = await requireApiUser({ roles: ['admin', 'manager'] });
    const { id } = await context.params;
    const target = await getUserById(id);
    if (!target) throw new ApiAccessError(404, 'Usuário não encontrado.');
    const body = (await request.json()) as Record<string, unknown>;
    const operation = String(body.operation || 'profile');
    const db = getD1();
    const now = Date.now();

    if (operation === 'profile') {
      if (!canManageTarget(actor, target)) throw new ApiAccessError(403, 'Alteração não autorizada.');
      const profile = validateProfilePayload({ ...body, email: target.email }, target.email);
      await db
        .prepare(
          `UPDATE users SET full_name = ?, phone = ?, education_level = ?,
            lattes_url = ?, orcid = ?, social_links_json = ?, address_postal_code = ?,
            address_street = ?, address_number = ?, address_complement = ?,
            address_neighborhood = ?, address_city = ?, address_state = ?,
            address_country = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
        )
        .bind(
          profile.fullName,
          profile.phone,
          profile.educationLevel,
          profile.lattesUrl,
          profile.orcid,
          JSON.stringify(profile.socialLinks),
          profile.address.postalCode,
          profile.address.street,
          profile.address.number,
          profile.address.complement || null,
          profile.address.neighborhood || null,
          profile.address.city,
          profile.address.state,
          profile.address.country,
          actor.id,
          now,
          target.id,
        )
        .run();
      await writeAudit(actor.id, target.id, 'user.profile_updated');
    } else if (operation === 'role') {
      const allowedRoles: AppRole[] = actor.role === 'admin'
        ? ['user', 'professor', 'manager', 'admin']
        : ['user', 'professor'];
      const role = validateRole(body.role, allowedRoles);
      if (!canManageTarget(actor, target, role)) throw new ApiAccessError(403, 'Alteração de papel não autorizada.');
      const result = await db
        .prepare(
          `UPDATE users SET role = ?, updated_by = ?, updated_at = ?
           WHERE id = ? AND NOT (
             account_type = 'human' AND role = 'admin' AND status = 'active'
             AND ? <> 'admin'
             AND (SELECT COUNT(*) FROM users
                  WHERE account_type = 'human' AND role = 'admin'
                    AND status = 'active' AND deleted_at IS NULL) <= 1
           )`,
        )
        .bind(role, actor.id, now, target.id, role)
        .run();
      await assertLastAdminStillExists(result);
      await writeAudit(actor.id, target.id, 'user.role_changed', { from: target.role, to: role });
    } else if (operation === 'status') {
      if (!canManageTarget(actor, target)) throw new ApiAccessError(403, 'Alteração de estado não autorizada.');
      const status = validateStatusPayload(body);
      const result = await db
        .prepare(
          `UPDATE users SET status = ?, status_reason = ?, suspended_until = ?,
             updated_by = ?, updated_at = ?
           WHERE id = ? AND NOT (
             account_type = 'human' AND role = 'admin' AND status = 'active'
             AND ? <> 'active'
             AND (SELECT COUNT(*) FROM users
                  WHERE account_type = 'human' AND role = 'admin'
                    AND status = 'active' AND deleted_at IS NULL) <= 1
           )`,
        )
        .bind(status.status, status.reason, status.suspendedUntil, actor.id, now, target.id, status.status)
        .run();
      await assertLastAdminStillExists(result);
      await db
        .prepare(
          `INSERT INTO account_status_events (
            target_user_id, previous_status, new_status, reason,
            suspended_until, actor_user_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          target.id,
          target.status,
          status.status,
          status.reason,
          status.suspendedUntil,
          actor.id,
          now,
        )
        .run();
      await writeAudit(actor.id, target.id, 'user.status_changed', {
        from: target.status,
        to: status.status,
      });
    } else {
      throw new ValidationError('Operação inválida.');
    }

    const updated = await getUserById(target.id);
    return NextResponse.json({ user: updated ? safeUser(updated) : null });
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
    const target = await getUserById(id);
    if (!target) throw new ApiAccessError(404, 'Usuário não encontrado.');
    if (!canManageTarget(actor, target)) throw new ApiAccessError(403, 'Exclusão não autorizada.');
    const now = Date.now();
    const db = getD1();
    const results = await db.batch([
      db
        .prepare(
          `UPDATE users SET auth_user_id = NULL, email = ?, full_name = 'Cadastro removido',
            phone = '', education_level = '', role = 'user', status = 'inactive',
            status_reason = 'Cadastro anonimizado', avatar_key = NULL, lattes_url = NULL,
            orcid = NULL, social_links_json = '{}', address_postal_code = '',
            address_street = '', address_number = '', address_complement = NULL,
            address_neighborhood = NULL, address_city = '', address_state = '',
            address_country = '', deleted_at = ?, updated_by = ?, updated_at = ?
           WHERE id = ? AND NOT (
             account_type = 'human' AND role = 'admin' AND status = 'active'
             AND (SELECT COUNT(*) FROM users
                  WHERE account_type = 'human' AND role = 'admin'
                    AND status = 'active' AND deleted_at IS NULL) <= 1
           )`,
        )
        .bind(`deleted-${target.id}@invalid.local`, now, actor.id, now, target.id),
      db
        .prepare(
          `DELETE FROM billing_profiles WHERE user_id = ?
           AND EXISTS (SELECT 1 FROM users WHERE id = ? AND deleted_at IS NOT NULL)`,
        )
        .bind(target.id, target.id),
      db
        .prepare(
          `DELETE FROM consent_events WHERE user_id = ?
           AND EXISTS (SELECT 1 FROM users WHERE id = ? AND deleted_at IS NOT NULL)`,
        )
        .bind(target.id, target.id),
    ]);
    await assertLastAdminStillExists(results[0]);
    if (target.avatarKey) await getFilesBucket().delete(target.avatarKey);
    await writeAudit(actor.id, target.id, 'user.anonymized');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

async function assertLastAdminStillExists(result: D1Result) {
  if (Number(result.meta.changes ?? 0) !== 1) {
    throw new ApiAccessError(409, 'O último administrador ativo não pode ser removido ou bloqueado.');
  }
}
