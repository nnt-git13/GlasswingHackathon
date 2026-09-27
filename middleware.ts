import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { safeNextPath } from '@/lib/auth/redirect';

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const authEntryPage = ['/', '/login', '/signup'].includes(path);
  const publicPage = authEntryPage || path === '/discover' || path.startsWith('/auth/');
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  let authenticated = false;
  if (config) {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    try {
      const { data, error } = await supabase.auth.getUser();
      authenticated = !error && !!data.user;
    } catch {
      authenticated = false;
    }
  }

  if (authenticated && authEntryPage) {
    response = copyResponseCookies(
      response,
      NextResponse.redirect(new URL('/discover', request.url)),
    );
  } else if (!publicPage && !authenticated) {
    const blocked = path.startsWith('/api/')
      ? NextResponse.json(
          path.startsWith('/api/gateway')
            ? {
                apiVersion: 'v1',
                error: {
                  code: 'AUTHENTICATION_REQUIRED',
                  message: 'Authentication required.',
                  retryable: false,
                },
              }
            : { error: 'Authentication required.' },
          { status: 401 },
        )
      : (() => {
          const login = new URL('/login', request.url);
          login.searchParams.set(
            'next',
            safeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
          );
          return NextResponse.redirect(login);
        })();
    response = copyResponseCookies(response, blocked);
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|backpack.jpg|mountains.jpg).*)'],
};
