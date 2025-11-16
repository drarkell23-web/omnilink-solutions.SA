import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  try {
    const { company, phone, password, telegram } = req.body;

    if (!company || !phone || !password) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // 1️⃣ CREATE EMAIL FOR CONTRACTOR
    const emailSafeName = company.replace(/\s+/g, "").toLowerCase();
    const email = `${emailSafeName}@contractors.omni`;

    // 2️⃣ CREATE AUTH USER
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ ok: false, error: authError.message });
    }

    // 3️⃣ HASH PASSWORD FOR OUR OWN TABLE
    const password_hash = await bcrypt.hash(password, 10);

    // 4️⃣ INSERT INTO CONTRACTORS TABLE
    const { error: dbError } = await supabase
      .from("contractors")
      .insert([
        {
          auth_id: authUser.user.id,
          company,
          phone,
          password_hash,
          telegram_chat_id: telegram || null,
          subscription_plan: "free"
        }
      ]);

    if (dbError) {
      return res.status(400).json({ ok: false, error: dbError.message });
    }

    res.json({
      ok: true,
      email,
      message: "Contractor created successfully!"
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
