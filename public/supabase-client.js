// supabase-client.js
// Replace the placeholders with your Supabase project info.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


export const SUPABASE_URL = 'https://obmbklanktevawuymkbq.supabase.co'; // 
export const SUPABASE_ANON_KEY = 'sb_publishable_s6K6pqGLGCwm56Fragf4wQ_KnDUDnQv'; // 


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
auth: { persistSession: true, detectSessionInUrl: true }
});


export async function getCurrentUser() {
const { data } = await supabase.auth.getUser();
return data?.user || null;
}
