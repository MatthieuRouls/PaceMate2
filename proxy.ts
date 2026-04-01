import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes qui nécessitent d'être connecté
const protectedRoutes = [
  '/dashboard',
  '/mes-sorties',
  '/sessions/create',
  '/friends',
  '/messages',
  '/profile',
  '/admin',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Court-circuit : seules la landing page et les routes protégées
  // nécessitent une vérification Supabase. Tout le reste passe directement.
  const isProtected = protectedRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
  const isLanding   = pathname === '/';

  if (!isLanding && !isProtected) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // Créer un response mutable pour que Supabase puisse rafraîchir les cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          request.cookies.set({ name, value, ...options } as any);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response.cookies.set({ name, value, ...options } as any);
        },
        remove(name: string, options: Record<string, unknown>) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          request.cookies.set({ name, value: '', ...options } as any);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response.cookies.set({ name, value: '', ...options } as any);
        },
      },
    }
  );

  // Récupérer la session (rafraîchit le token si nécessaire)
  const { data: { session } } = await supabase.auth.getSession();
  const isAuthenticated = !!session?.user;

  // RÈGLE 1: Landing page → si connecté, aller au dashboard
  if (pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // RÈGLE 2: Routes protégées → si pas connecté, aller à la landing page
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
