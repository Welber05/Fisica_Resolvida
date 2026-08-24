import { NextResponse } from 'next/server';
import { listQuestionCurations, requireApiUser } from '@/lib/user-service';
import { jsonError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireApiUser({ roles: ['admin', 'manager', 'professor'] });
    return NextResponse.json({ curations: await listQuestionCurations() });
  } catch (error) {
    return jsonError(error);
  }
}
