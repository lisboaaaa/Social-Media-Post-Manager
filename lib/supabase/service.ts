import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only, privileged client that bypasses RLS entirely. Used only by
// code that has already authenticated the caller through some other means
// (the MCP route's bearer-token check). Never import this from a Client
// Component or anything that ships to the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
