// /api/contractor.js
import { supabase } from "../public/supabase-client.js";

export async function POST(req) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("contractors")
      .upsert({
        id: body.id,
        name: body.name,
        phone: body.phone,
        email: body.email,
        service: body.service,
        location: body.location,
        chatbot_id: body.chatbot_id || null,
        chatbot_token: body.chatbot_token || null,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) return new Response(JSON.stringify({ ok: false, error }), { status: 400 });

    return new Response(JSON.stringify({ ok: true, contractor: data[0] }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
