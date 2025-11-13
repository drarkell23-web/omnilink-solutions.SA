// public/supabase-client.js
// Frontend Supabase client: safe to include in browser (uses anon key).
// Replace SUPABASE_ANON_KEY placeholder with your anon key (or set via templating / env injection).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://obmbklanktevawuymkbq.supabase.co"; // <-- replace if different
export const SUPABASE_ANON_KEY = "SUPABASE_ANON_PLACEHOLDER"; // <-- replace with anon key (paste into file or inject)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true }
});

// helper: get current user
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}
