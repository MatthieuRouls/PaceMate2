import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Le middleware est désormais simplifié car l'authentification est gérée
// côté client par AuthProvider. Les pages protégées se chargent de rediriger
// les utilisateurs non connectés via useEffect.

export async function middleware(request: NextRequest) {
  // Laisser passer toutes les requêtes
  // La protection des routes est gérée côté client
  return NextResponse.next();
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
