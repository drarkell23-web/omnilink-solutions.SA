// auth.js - client-side Supabase helpers used by login/signup pages and dashboards
// IMPORTANT: this file uses SUPABASE_ANON_KEY (client-safe anon key) and SUPABASE_URL.
// Set them in your index.html as global vars or adjust accordingly.

const SUPABASE_URL = window.SUPABASE_URL || (new URL('/', location).origin + '/'); // fallback
// REPLACE these inline or better: serve them via server rendering or include constants in your build
const SUPABASE_ANON_KEY = 'REPLACE_WITH_SUPABASE_ANON_KEY'; // <-- Replace in client when deploying (anon)
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('REPLACE')) {
  console.warn('Supabase anon key not set in auth.js. Set SUPABASE_ANON_KEY in file or embed via script.');
}

let supabase = null;
try {
  // dynamic import to avoid bundling issues: if supabase lib is included via <script> you can change this
  // For simplest usage, include the supabase JS bundle in your project or use CDN.
  // Here we use global import via window.supabase if provided, else lazy load.
  // NOTE: On Render we will use minimal client auth flows and call server endpoints for data.
  // For now we export a small wrapper object to use where necessary.
} catch(e){ console.warn('auth init err', e); }

export function initClient(supabaseUrl, anonKey) {
  if (!supabaseUrl || !anonKey) {
    console.warn('initClient missing supabaseUrl / anonKey');
    return null;
  }
  // lazy import of @supabase/supabase-js via a CDN (if not available in project)
  // We'll use global supabase client created here:
  if (typeof supabase !== 'object') {
    const { createClient } = window.supabase || {};
    if (createClient) {
      supabase = createClient(supabaseUrl, anonKey);
      return supabase;
    }
    // fallback to dynamic import
    return import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm').then(mod=>{
      const client = mod.createClient(supabaseUrl, anonKey);
      supabase = client;
      return client;
    });
  }
  return supabase;
}
