import { NextResponse } from 'next/server';
import { createLocalSession, LOCAL_SESSION_COOKIE } from '@/lib/local-auth';
import { assertSameOrigin, jsonError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = (await request.json()) as Record<string, unknown>;
    const session = await createLocalSession(
      String(body.email || ''),
      String(body.password || ''),
    );
    const response = NextResponse.json({ ok: true, returnTo: session.returnTo });
    response.cookies.set(LOCAL_SESSION_COOKIE, session.cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
