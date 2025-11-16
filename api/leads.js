// /api/lead.js
import { supabase } from "../public/supabase-client.js";

/*
  POST  -> create a lead
  PATCH -> update a lead (assign contractor_id, update status, etc)
*/

export async function POST(req) {
  try {
    const body = await req.json();
    const payload = {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      service: body.service || null,
      message: body.message || body.description || null,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('leads').insert([payload]).select();
    if (error) return new Response(JSON.stringify({ ok:false, error }), { status:400 });
    return new Response(JSON.stringify({ ok:true, lead: data[0] }), { status:200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error: String(err) }), { status:500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    if (!body.id) return new Response(JSON.stringify({ ok:false, error: 'missing id' }), { status:400 });

    const updates = {};
    if (body.contractor_id !== undefined) updates.contractor_id = body.contractor_id;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('leads').update(updates).eq('id', body.id).select();
    if (error) return new Response(JSON.stringify({ ok:false, error }), { status:400 });
    return new Response(JSON.stringify({ ok:true, lead: data[0] }), { status:200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error: String(err) }), { status:500 });
  }
}
