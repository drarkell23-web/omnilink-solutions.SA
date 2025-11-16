// /api/services.js
import { supabase } from "../public/supabase-client.js";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const cat = url.searchParams.get("cat");

    let query = supabase.from("services").select("*");

    if (cat) query = query.eq("category", cat);

    const { data, error } = await query.order("name", { ascending: true });

    if (error) return new Response(JSON.stringify({ ok: false, error }), { status: 400 });

    return new Response(JSON.stringify({ ok: true, services: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
