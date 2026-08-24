import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { listPaymentMethods, requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireApiUser({ roles: ['admin', 'manager'] });
    return NextResponse.json({ methods: await listPaymentMethods() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager'] });
    const method = validatePaymentMethod(await request.json());
    const now = Date.now();
    const id = crypto.randomUUID();
    await getD1()
      .prepare(
        `INSERT INTO payment_methods
          (id, name, method_type, provider, instructions_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, method.name, method.methodType, method.provider, JSON.stringify(method.instructions), method.status, now, now)
      .run();
    await writeAudit(user.id, id, 'billing.payment_method_created', { methodType: method.methodType });
    return NextResponse.json({ methods: await listPaymentMethods() }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

function validatePaymentMethod(value: unknown) {
  const input = objectValue(value);
  const status = text(input.status || 'active', 'status', 2, 20) as 'active' | 'inactive';
  if (!['active', 'inactive'].includes(status)) throw new ValidationError('Status de pagamento inválido.');
  return {
    name: text(input.name, 'nome da forma de pagamento', 2, 120),
    methodType: text(input.methodType || 'pix', 'tipo', 2, 40),
    provider: text(input.provider || 'manual', 'provedor', 2, 80),
    instructions: {
      label: optionalText(input.instructionsLabel, 160),
      value: optionalText(input.instructionsValue, 300),
      notes: optionalText(input.instructionsNotes, 500),
    },
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

function optionalText(value: unknown, max: number) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new ValidationError('Um dos campos excede o limite permitido.');
  return result;
}
