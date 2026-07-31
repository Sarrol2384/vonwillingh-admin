"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "./types";

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Edit .env.local with your project URL and anon key, then restart the dev server.",
    );
  }

  const url = supabaseUrl();
  try {
    // eslint-disable-next-line no-new -- URL constructor validates shape
    new URL(url);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not a valid URL. Fix .env.local and restart the dev server.",
    );
  }

  return createBrowserClient<Database>(url, supabaseAnonKey());
}
