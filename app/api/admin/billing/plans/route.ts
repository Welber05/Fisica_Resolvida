import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { listBillingPlans, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireApiUser({ roles: ['admin', 'manager'] });
    return NextResponse.json({ plans: await listBillingPlans() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager'] });
    const plan = validatePlan(await request.json());
    const now = Date.now();
    const id = crypto.randomUUID();
    await getD1()
      .prepare(
        `INSERT INTO billing_plans
          (id, code, name, license_type, billing_cycle, price_cents, currency, max_users, features_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
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
        now,
      )
      .run();
    await writeAudit(user.id, id, 'billing.plan_created', { code: plan.code });
    return NextResponse.json({ plans: await listBillingPlans() }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

function validatePlan(value: unknown) {
  const input = objectValue(value);
  const code = text(input.code, 'código', 2, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const licenseType = text(input.licenseType || 'individual', 'tipo de licença', 2, 40);
  const billingCycle = text(input.billingCycle || 'monthly', 'ciclo', 2, 40);
  const status = text(input.status || 'active', 'status', 2, 20) as 'active' | 'inactive';
  if (!['active', 'inactive'].includes(status)) throw new ValidationError('Status de plano inválido.');
  const priceCents = Math.max(0, Math.round(Number(input.priceCents ?? 0)));
  const maxUsers = Math.max(1, Math.round(Number(input.maxUsers ?? 1)));
  const features = String(input.features ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
  return {
    code,
    name: text(input.name, 'nome do plano', 2, 120),
    licenseType,
    billingCycle,
    priceCents,
    currency: text(input.currency || 'BRL', 'moeda', 3, 3).toUpperCase(),
    maxUsers,
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
