import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { listBillingPlans, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager'] });
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const now = Date.now();
    if (body.operation === 'status') {
      const status = String(body.status || 'active');
      if (!['active', 'inactive'].includes(status)) throw new ValidationError('Status de plano inválido.');
      await getD1()
        .prepare('UPDATE billing_plans SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
        .bind(status, now, id)
        .run();
      await writeAudit(user.id, id, 'billing.plan_status_changed', { status });
    } else {
      const plan = validatePlan(body);
      await getD1()
        .prepare(
          `UPDATE billing_plans SET
            code = ?, name = ?, license_type = ?, billing_cycle = ?, price_cents = ?,
            currency = ?, max_users = ?, features_json = ?, status = ?, updated_at = ?
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .bind(
          plan.code,
          plan.name,
          plan.licenseType,
          plan.billingCycle,
          plan.priceCents,
          plan.currency,
          plan.maxUsers,
          JSON.stringify(plan.features),
          plan.status,
          now,
          id,
        )
        .run();
      await writeAudit(user.id, id, 'billing.plan_updated', { code: plan.code });
    }
    return NextResponse.json({ plans: await listBillingPlans() });
  } catch (error) {
    return jsonError(error);
  }
}

function validatePlan(value: unknown) {
  const input = objectValue(value);
  const code = text(input.code, 'código', 2, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const status = text(input.status || 'active', 'status', 2, 20) as 'active' | 'inactive';
  if (!['active', 'inactive'].includes(status)) throw new ValidationError('Status de plano inválido.');
  const features = String(input.features ?? '').split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 20);
  return {
    code,
    name: text(input.name, 'nome do plano', 2, 120),
    licenseType: text(input.licenseType || 'individual', 'tipo de licença', 2, 40),
    billingCycle: text(input.billingCycle || 'monthly', 'ciclo', 2, 40),
    priceCents: Math.max(0, Math.round(Number(input.priceCents ?? 0))),
    currency: text(input.currency || 'BRL', 'moeda', 3, 3).toUpperCase(),
    maxUsers: Math.max(1, Math.round(Number(input.maxUsers ?? 1))),
    features,
    status,
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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager'] });
    const { id } = await context.params;
    await getD1()
      .prepare('UPDATE billing_plans SET deleted_at = ?, status = ? WHERE id = ? AND deleted_at IS NULL')
      .bind(Date.now(), 'inactive', id)
      .run();
    await writeAudit(user.id, id, 'billing.plan_deleted');
    return NextResponse.json({ plans: await listBillingPlans() });
  } catch (error) {
    return jsonError(error);
  }
}
