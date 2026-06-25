import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using the SECRET service-role key.
 * - BYPASSES Row Level Security.
 * - Required for admin user creation (`auth.admin.createUser`).
 * - MUST only ever run on the server. `server-only` makes a client import fail the build.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
