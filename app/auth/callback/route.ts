import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error)
        return new NextResponse(null, {
          status: 303,
          headers: { Location: next, 'Cache-Control': 'no-store' },
        });
    } catch {}
  }

  const login = new URL('/login', request.url);
  login.searchParams.set(
    'error',
    request.nextUrl.searchParams.get('error') ? 'oauth' : 'confirmation',
  );
  if (next !== '/discover') login.searchParams.set('next', next);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `${login.pathname}${login.search}`, 'Cache-Control': 'no-store' },
  });
}
