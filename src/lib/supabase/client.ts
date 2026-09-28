import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://rabrxxrmphfpoyfurlbs.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhYnJ4eHJtcGhmcG95ZnVybGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NzQ2ODgsImV4cCI6MjEwNjE1MDY4OH0.eehB-jRWcmD5n1hhp8Gz1xA4hUwFWxvo5MvJot5Uuuo";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseKey);
}

// Cached singleton instance for client-side reuse
export const supabase = createClient();
