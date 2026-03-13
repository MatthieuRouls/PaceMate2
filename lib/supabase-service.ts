import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase avec la service role key — bypasse RLS.
 * À utiliser UNIQUEMENT côté serveur (server actions, API routes) après validateAdmin().
 * Ne jamais exposer côté client.
 */
export function getServiceSupabaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurée');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
