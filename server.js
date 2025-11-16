// server.js — OmniLead API Server
import express from "express";
import fileUpload from "express-fileupload";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";   // bcryptjs works everywhere, including Render

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// ---------------------------------------------
// SUPER IMPORTANT — ENV VARIABLES
// ---------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY;

// Stop server if missing vars
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌ Missing Supabase environment variables!");
  console.error("SUPABASE_URL =", SUPABASE_URL);
  console.error("SUPABASE_SERVICE_KEY =", SERVICE_ROLE ? "SET" : "MISSING");
  process.exit(1);
}

// CONNECT TO SUPABASE USING SERVICE ROLE KEY
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// STATIC FRONTEND FILES
app.use(express.static("public"));
app.use(express.static("./"));


// ======================================================================
// 🔐 ADMIN PAGE — inject ADMIN_PORTAL_KEY into HTML
// ======================================================================
app.get("/admin-create-contractor.html", (req, res) => {
  try {
    const html = fs.readFileSync("admin-create-contractor.html", "utf8");

    const injected = html.replace(
      "{{ADMIN_PORTAL_KEY}}",
      ADMIN_PORTAL_KEY || "NO_ADMIN_KEY_SET"
    );

    res.send(injected);
  } catch (err) {
    res.status(500).send("Admin page missing.");
  }
});



// ======================================================================
// 🔥 ADMIN — CREATE CONTRACTOR (PASSWORD HASHED)
// ======================================================================
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    const { company, phone, password, telegram } = req.body;

    if (!company || !phone || !password) {
      return res.json({ ok: false, error: "Missing required fields." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("contractors")
      .insert([
        {
          company,
          phone,
          password_hash,
          telegram_chat_id: telegram || null,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) return res.json({ ok: false, error: error.message });

    res.json({ ok: true, contractor: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});



// ======================================================================
// 🚀 CONTRACTOR LOGIN (phone + password)
// ======================================================================
app.post("/api/contractor/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const { data: contractor, error } = await supabase
      .from("contractors")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error || !contractor)
      return res.json({ ok: false, error: "Contractor not found." });

    const match = await bcrypt.compare(password, contractor.password_hash);
    if (!match) return res.json({ ok: false, error: "Invalid password." });

    return res.json({ ok: true, contractor });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});



// ======================================================================
// 📩 SAVE LEAD  (THIS IS THE FIXED ROUTE YOUR CHATBOT USES)
// ======================================================================
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractor_id } = req.body;

    const { data, error } = await supabase
      .from("leads")
      .insert([
        {
          name,
          phone,
          email,
          service,
          message,
          contractor_id: contractor_id || null,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) return res.json({ ok: false, error: error.message });

    res.json({ ok: true, lead: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});



// ======================================================================
// ⭐ REVIEWS — TEXT + IMAGES
// ======================================================================
app.post("/api/review", async (req, res) => {
  try {
    const contractorId = req.body.contractor || req.body.contractor_id;
    const name = req.body.name || "Customer";
    const rating = Number(req.body.rating || 5);
    const comment = req.body.comment || "";
    const images = [];

    if (req.files) {
      for (const fileKey of Object.keys(req.files)) {
        const file = req.files[fileKey];

        const filePath = `reviews/${Date.now()}-${file.name.replace(/\s/g, "_")}`;

        const upload = await supabase.storage
          .from("contractor-assets")
          .upload(filePath, file.data, {
            upsert: true,
            contentType: file.mimetype
          });

        if (!upload.error) {
          const url = supabase.storage
            .from("contractor-assets")
            .getPublicUrl(filePath).data.publicUrl;

          images.push(url);
        }
      }
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert([
        {
          contractor_id: contractorId,
          reviewer_name: name,
          rating,
          comment,
          images,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) return res.json({ ok: false, error: error.message });

    res.json({ ok: true, review: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});



// ======================================================================
// 💬 CONTRACTOR → ADMIN MESSAGES
// ======================================================================
app.post("/api/message", async (req, res) => {
  try {
    const { contractorId, message } = req.body;

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          contractor_id: contractorId,
          message,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) return res.json({ ok: false, error: error.message });

    res.json({ ok: true, message: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});



// ======================================================================
// 🚀 START SERVER
// ======================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("OmniLead API running on port " + PORT);
});
