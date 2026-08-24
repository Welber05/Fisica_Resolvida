import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const LEGACY_LOCAL_SESSION_COOKIE = 'fr_session';

export async function GET(request: Request) {
  return signOut(request);
}

export async function POST(request: Request) {
  return signOut(request);
}

async function signOut(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(LEGACY_LOCAL_SESSION_COOKIE);
  return response;
}
