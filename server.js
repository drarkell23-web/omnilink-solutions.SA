// server.js — lightweight API for public main site

import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// ENV
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN;

// Supabase
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("Supabase connected.");
} else {
  console.log("⚠ No Supabase configured — using local JSON fallback.");
}

// Helper replace fs-extra
async function readJson(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = await fs.promises.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(file, data) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, JSON.stringify(data, null, 2));
}

// Serve static frontend
app.use(express.static("public"));
app.use(express.static("."));

// -------------------------------
// LOCAL JSON DATA ENDPOINTS
// -------------------------------
app.get("/data/services.json", async (req, res) => {
  const file = path.join(process.cwd(), "data", "services.json");
  return fs.existsSync(file)
    ? res.sendFile(file)
    : res.json({ services: [] });
});

app.get("/data/contractors.json", async (req, res) => {
  const file = path.join(process.cwd(), "data", "contractors.json");
  return fs.existsSync(file)
    ? res.sendFile(file)
    : res.json({ contractors: [] });
});

app.get("/data/reviews.json", async (req, res) => {
  const file = path.join(process.cwd(), "data", "reviews.json");
  return fs.existsSync(file)
    ? res.sendFile(file)
    : res.json({ reviews: [] });
});

// -------------------------------
// API: CONTRACTORS
// -------------------------------
app.get("/api/contractors", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) return res.json({ ok: false, error: error.message });
      return res.json({ ok: true, contractors: data });
    }

    const file = path.join(process.cwd(), "data", "contractors.json");
    const json = (await readJson(file)) || { contractors: [] };
    return res.json({ ok: true, contractors: json.contractors });
  } catch (err) {
    return res.json({ ok: false, error: String(err) });
  }
});

// -------------------------------
// API: SERVICES
// -------------------------------
app.get("/api/services", async (req, res) => {
  const file = path.join(process.cwd(), "data", "services.json");
  const json = (await readJson(file)) || { services: [] };
  return res.json(json);
});

// -------------------------------
// API: LEAD SUBMISSION
// -------------------------------
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractorId } = req.body;

    if (!name || !phone || !service) {
      return res.json({ ok: false, error: "Missing required fields." });
    }

    const lead = {
      name,
      phone,
      email: email || null,
      service,
      message: message || "",
      contractor_id: contractorId || null,
      created_at: new Date().toISOString(),
      source: "web"
    };

    // Save to Supabase or local
    let saved = null;

    if (supabase) {
      const { data, error } = await supabase
        .from("leads")
        .insert([lead])
        .select()
        .maybeSingle();

      if (error) console.log("Supabase lead save error:", error.message);
      saved = data || lead;
    } else {
      const file = path.join(process.cwd(), "data", "leads.json");
      const arr = (await readJson(file)) || [];
      arr.unshift(lead);
      await writeJson(file, arr);
      saved = lead;
    }

    // Telegram notification
    try {
      let target = TELEGRAM_CHAT_ID_ADMIN;

      // If contractor has a Telegram chat ID
      if (contractorId && supabase) {
        const { data: c } = await supabase
          .from("contractors")
          .select("telegram_chat_id")
          .eq("id", contractorId)
          .maybeSingle();

        if (c?.telegram_chat_id) target = c.telegram_chat_id;
      }

      if (TELEGRAM_BOT_TOKEN && target) {
        const msg =
          `📩 *New Lead*\n` +
          `*Name:* ${name}\n` +
          `*Phone:* ${phone}\n` +
          `*Service:* ${service}\n` +
          `*Message:* ${message || "-"}\n`;

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: target,
              text: msg,
              parse_mode: "Markdown"
            })
          }
        );
      }
    } catch (teleErr) {
      console.log("Telegram error:", teleErr.message);
    }

    return res.json({ ok: true, lead: saved });
  } catch (err) {
    return res.json({ ok: false, error: String(err) });
  }
});

// -------------------------------
// FALLBACK ROUTE
// -------------------------------
app.use((req, res) => {
  res.status(404).send("Not found");
});

// -------------------------------
// START SERVER
// -------------------------------
app.listen(PORT, () => console.log(`Main site API running on port ${PORT}`));
