import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Routes publiques (pas d'authentification requise)
const publicRoutes = ['/', '/auth/login', '/auth/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si la route est publique
  const isPublicRoute = publicRoutes.some((route) => pathname === route);

  // Si la route est publique, laisser passer
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Pour les routes protégées, vérifier l'authentification
  try {
    // Créer un client Supabase pour le middleware
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    // Récupérer le token d'authentification depuis les cookies
    const token = request.cookies.get('sb-access-token')?.value;

    if (!token) {
      // Pas de token, rediriger vers login
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Vérifier que le token est valide
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Token invalide, rediriger vers login
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Utilisateur authentifié, laisser passer
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // En cas d'erreur, rediriger vers login par sécurité
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Configuration du matcher pour définir quelles routes le middleware doit traiter
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
