import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (uses the public anon key).
 * Safe to use in Client Components. RLS enforces row access.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
