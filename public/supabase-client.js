// public/supabase-client.js
(function () {
  const PUBLIC_URL = window.SUPABASE_URL || "{{SUPABASE_URL}}";
  const PUBLIC_KEY = window.SUPABASE_ANON_KEY || "{{SUPABASE_ANON_KEY}}";

  if (typeof supabase === "undefined") {
    console.error("Supabase UMD not loaded. Please include the supabase-js UMD before this file.");
    return;
  }

  window.supabase = supabase.createClient(PUBLIC_URL, PUBLIC_KEY);
})();