// public/supabase-client.js (paste to public/)
// Replace the values with your project's URL and anon key OR set at deploy-time
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://obmbklanktevawuymkbq.supabase.co"; // <-- replace if needed
export const SUPABASE_ANON_KEY = "sb_publishable_s6K6pqGLGCwm56Fragf4wQ_KnDUDnQv"; // <-- replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true }
});

export async function getCurrentUser(){
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}
