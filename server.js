// server.js — OmniLead / Service Point SA minimal API + static frontend server
import express from "express";
import fileUpload from "express-fileupload";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// static
app.use(express.static("public"));
app.use(express.static("assets"));
app.use(express.static("./"));

// env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN || "";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌ Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Serve index
app.get("/", (req, res) => {
  try {
    const html = fs.readFileSync("index.html", "utf8");
    res.send(html);
  } catch (err) {
    res.status(500).send("index.html not found");
  }
});

// Proxy endpoints (use service role)
app.get("/api/services", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name", { ascending: true })
      .limit(1000);

    if (error) return res.status(400).json({ ok: false, error: error.message });
    res.json({ ok: true, services: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/contractors", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("contractors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return res.status(400).json({ ok: false, error: error.message });
    res.json({ ok: true, contractors: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return res.status(400).json({ ok: false, error: error.message });
    res.json({ ok: true, reviews: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/lead  -- receives leads from chatbot or site and inserts to Supabase
app.post("/api/lead", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      name: body.name || null,
      phone: body.phone || null,
      email: body.email || null,
      service: body.service || null,
      message: body.message || null,
      contractor_id: body.contractorId || body.contractor_id || null,
      source: body.source || "web",
      created_at: new Date().toISOString()
    };

    if (!payload.name || !payload.phone || !payload.service) {
      return res.status(400).json({ ok: false, error: "name, phone and service are required" });
    }

    const { data, error } = await supabase.from("leads").insert([payload]).select().maybeSingle();
    if (error) return res.status(400).json({ ok: false, error: error.message });

    // OPTIONAL: notify admin via Telegram (if token + chat id present)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID_ADMIN) {
      try {
        const text = `New lead from Service Point SA:\nName: ${payload.name}\nPhone: ${payload.phone}\nService: ${payload.service}\nEmail: ${payload.email || "-"}\nContractor: ${payload.contractor_id || "any"}`;
        const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(tgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID_ADMIN, text })
        });
      } catch (e) {
        console.warn("Telegram notify failed:", e.message || e);
      }
    }

    res.status(201).json({ ok: true, lead: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OmniLead API running on port ${PORT}`);
});
