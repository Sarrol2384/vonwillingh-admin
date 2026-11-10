import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/** Prefer service role for cron; fall back to anon (RLS still applies). */
export function createSupabaseAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return createClient<Database>(
    supabaseUrl(),
    serviceKey || supabaseAnonKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/**
 * Server-only client for the public invoice page.
 * Uses the service role key and never falls back to the anon key.
 */
export function createSupabaseServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey || serviceKey.startsWith("your-")) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Public invoice pages load one invoice by token on the server and need the service role key.",
    );
  }

  return createClient<Database>(supabaseUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
