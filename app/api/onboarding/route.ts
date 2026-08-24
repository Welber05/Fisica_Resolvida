import { NextResponse } from 'next/server';
import { ensureSchema, getD1 } from '@/db';
import { requireApiUser, safeUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, validateProfilePayload, ValidationError } from '@/lib/validation';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { identity, user } = await requireApiUser({ allowIncomplete: true });
    const body = (await request.json()) as Record<string, unknown>;
    if (body.privacyAccepted !== true) {
      throw new ValidationError('É necessário aceitar os termos e a política de privacidade.');
    }
    const profile = validateProfilePayload(body, identity.email);
    const now = Date.now();
    const educatorVerificationStatus =
      profile.professionalType === 'student' ? 'not_requested' : 'pending';
    await ensureSchema();
    const db = getD1();
    await db.batch([
      db
        .prepare(
          `UPDATE users SET
            full_name = ?, phone = ?, education_level = ?, lattes_url = ?, orcid = ?,
            professional_type = ?, educator_verification_status = ?,
            institutional_email = ?, functional_id = ?, cpf = ?,
            social_links_json = ?, address_postal_code = ?, address_street = ?,
            address_number = ?, address_complement = ?, address_neighborhood = ?,
            address_city = ?, address_state = ?, address_country = ?,
            profile_complete = 1, privacy_accepted_at = ?, updated_by = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          profile.fullName,
          profile.phone,
          profile.educationLevel,
          profile.lattesUrl,
          profile.orcid,
          profile.professionalType,
          educatorVerificationStatus,
          profile.institutionalEmail,
          profile.functionalId,
          profile.cpf,
          JSON.stringify(profile.socialLinks),
          profile.address.postalCode,
          profile.address.street,
          profile.address.number,
          profile.address.complement || null,
          profile.address.neighborhood || null,
          profile.address.city,
          profile.address.state,
          profile.address.country,
          now,
          user.id,
          now,
          user.id,
        ),
      db
        .prepare(
          `INSERT INTO consent_events (user_id, document_type, document_version, accepted, occurred_at)
           VALUES (?, 'privacy_and_terms', ?, 1, ?)`,
        )
        .bind(user.id, LEGAL_DOCUMENT_VERSION, now),
    ]);
    await writeAudit(user.id, user.id, 'profile.onboarding_completed');
    return NextResponse.json({
      user: safeUser({ ...user, ...profile, educatorVerificationStatus, profileComplete: true }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
