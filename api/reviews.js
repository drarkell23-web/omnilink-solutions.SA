// /api/review.js
import { supabase } from "../public/supabase-client.js";

export async function POST(req) {
  try {
    const form = await req.formData();

    const name = form.get("name");
    const rating = form.get("rating");
    const review = form.get("review");
    const contractor_id = form.get("contractor_id");

    const file = form.get("photo");

    let photo_url = null;

    if (file && file.name) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("reviews")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      photo_url = supabase.storage.from("reviews").getPublicUrl(fileName).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert([{
        name,
        rating,
        review,
        contractor_id,
        photo_url,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) return new Response(JSON.stringify({ ok: false, error }), { status: 400 });

    return new Response(JSON.stringify({ ok: true, review: data[0] }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
