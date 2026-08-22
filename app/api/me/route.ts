import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { requireApiUser, safeUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, validateProfilePayload } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user } = await requireApiUser();
    return NextResponse.json({ user: safeUser(user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const { identity, user } = await requireApiUser();
    const profile = validateProfilePayload(await request.json(), identity.email);
    const now = Date.now();
    await getD1()
      .prepare(
        `UPDATE users SET
          full_name = ?, phone = ?, education_level = ?, lattes_url = ?, orcid = ?,
          social_links_json = ?, address_postal_code = ?, address_street = ?,
          address_number = ?, address_complement = ?, address_neighborhood = ?,
          address_city = ?, address_state = ?, address_country = ?, updated_by = ?, updated_at = ?
         WHERE id = ?`,
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
        user.id,
        now,
        user.id,
      )
      .run();
    await writeAudit(user.id, user.id, 'profile.updated');
    return NextResponse.json({ user: safeUser({ ...user, ...profile, updatedAt: now }) });
  } catch (error) {
    return jsonError(error);
  }
}
