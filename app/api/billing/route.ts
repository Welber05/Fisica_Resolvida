import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getBillingProfile, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, validateBillingPayload } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user } = await requireApiUser();
    return NextResponse.json({ billing: await getBillingProfile(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser();
    const billing = validateBillingPayload(await request.json());
    const now = Date.now();
    await getD1()
      .prepare(
        `INSERT INTO billing_profiles (
          user_id, payer_type, legal_name, document_type, document_number,
          company_name, billing_email, billing_phone, postal_code, street,
          number, complement, neighborhood, city, state, country, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          payer_type = excluded.payer_type, legal_name = excluded.legal_name,
          document_type = excluded.document_type, document_number = excluded.document_number,
          company_name = excluded.company_name, billing_email = excluded.billing_email,
          billing_phone = excluded.billing_phone, postal_code = excluded.postal_code,
          street = excluded.street, number = excluded.number, complement = excluded.complement,
          neighborhood = excluded.neighborhood, city = excluded.city, state = excluded.state,
          country = excluded.country, updated_at = excluded.updated_at`,
      )
      .bind(
        user.id,
        billing.payerType,
        billing.legalName,
        billing.documentType,
        billing.documentNumber,
        billing.companyName,
        billing.billingEmail,
        billing.billingPhone,
        billing.postalCode,
        billing.street,
        billing.number,
        billing.complement,
        billing.neighborhood,
        billing.city,
        billing.state,
        billing.country,
        now,
      )
      .run();
    await writeAudit(user.id, user.id, 'billing.updated', {
      payerType: billing.payerType,
      documentType: billing.documentType,
    });
    return NextResponse.json({ billing: await getBillingProfile(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}
