import { NextResponse } from 'next/server';
import { LOCAL_SESSION_COOKIE, revokeLocalSession } from '@/lib/local-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return signOut(request);
}

export async function POST(request: Request) {
  return signOut(request);
}

async function signOut(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  const sessionValue = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCAL_SESSION_COOKIE}=`))
    ?.slice(LOCAL_SESSION_COOKIE.length + 1);
  await revokeLocalSession(sessionValue ? decodeURIComponent(sessionValue) : undefined);
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(LOCAL_SESSION_COOKIE);
  return response;
}
