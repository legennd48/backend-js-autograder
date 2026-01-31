import { NextRequest, NextResponse } from 'next/server';
import { createAuthToken, getAuthCookieName } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = (body?.password ?? '') as string;

    const expected = process.env.APP_PASSWORD;
    if (!expected) {
      return NextResponse.json(
        { error: 'APP_PASSWORD is not configured on the server' },
        { status: 500 }
      );
    }

    if (!password || password !== expected) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const { token } = await createAuthToken({ ttlSeconds: 60 * 60 * 24 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Login failed' },
      { status: 500 }
    );
  }
}
