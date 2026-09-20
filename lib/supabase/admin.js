import { createClient as createSupabase } from '@supabase/supabase-js';

// Service-role client: BYPASSES RLS. Server-side only, never import in a
// client component, and always check the user's permission before using it.
export function createAdminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
