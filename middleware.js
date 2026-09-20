import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Runs before every page request.
// 1) keeps the Supabase login cookie fresh
// 2) sends logged-out visitors away from private pages
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminArea = path === '/admin' || path.startsWith('/admin/');
  const isAdminLogin = path === '/admin/login';
  const isPrivate =
    ['/dashboard', '/subscribe'].some((p) => path.startsWith(p)) ||
    (isAdminArea && !isAdminLogin);

  if (!user && isPrivate) {
    const url = request.nextUrl.clone();
    // the admin area sends logged-out visitors to its own login page
    url.pathname = isAdminArea ? '/admin/login' : '/login';
    url.search = isAdminArea ? '' : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // skip static files and the Stripe webhook (Stripe has no login cookie)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook).*)'],
};
