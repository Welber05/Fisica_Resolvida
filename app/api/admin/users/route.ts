import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { ApiAccessError, listUsers, requireApiUser, safeUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, validateAdminUserPayload } from '@/lib/validation';
import type { AppRole } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireApiUser({ roles: ['admin', 'manager'] });
    return NextResponse.json({ users: (await listUsers()).map(safeUser) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user: actor } = await requireApiUser({ roles: ['admin', 'manager'] });
    const allowedRoles: AppRole[] = actor.role === 'admin'
      ? ['user', 'professor', 'manager', 'admin']
      : ['user', 'professor'];
    const body = (await request.json()) as Record<string, unknown>;
    const profile = validateAdminUserPayload(body, allowedRoles);
    const db = getD1();
    const existing = await db
      .prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL')
      .bind(profile.email)
      .first<{ id: string }>();
    if (existing) throw new ApiAccessError(409, 'Já existe um cadastro com este e-mail.');

    const id = crypto.randomUUID();
    const now = Date.now();
    const educatorVerificationStatus = profile.professionalType === 'student' ? 'not_requested' : 'pending';
    await db
      .prepare(
        `INSERT INTO users (
          id, email, full_name, phone, education_level, role, status,
          professional_type, educator_verification_status, institutional_email, functional_id, cpf,
          lattes_url, orcid, social_links_json, address_postal_code,
          address_street, address_number, address_complement, address_neighborhood,
          address_city, address_state, address_country, profile_complete,
          created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        profile.email,
        profile.fullName,
        profile.phone,
        profile.educationLevel,
        profile.role,
        profile.professionalType,
        educatorVerificationStatus,
        profile.institutionalEmail,
        profile.functionalId,
        profile.cpf,
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
        actor.id,
        now,
        now,
      )
      .run();
    await writeAudit(actor.id, id, 'user.created', { role: profile.role });
    const created = (await listUsers()).find((user) => user.id === id);
    return NextResponse.json({ user: created ? safeUser(created) : null }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
