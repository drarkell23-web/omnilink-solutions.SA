// public/supabase-admin.js
// Client helper but do NOT store secrets here. Use server endpoints for admin actions that require the service_role key.
export async function callAdminApi(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}
