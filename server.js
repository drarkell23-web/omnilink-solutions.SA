// server.js — OmniLead API (Full integration: Supabase service role, bcryptjs, Telegram, admin create)
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

// environment
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY; // secret key (string)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN;

// supabase service client (optional fallback)
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("Supabase service client enabled.");
} else {
  console.warn("Supabase service client NOT configured — using local JSON fallback for development.");
}

// static files (public folder)
app.use(express.static("public"));
app.use(express.static("."));

// helper - telegram notify
async function notifyTelegram(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
  } catch (e) {
    console.warn("Telegram send failed:", e.message);
  }
}

// -------------------------
// ADMIN: serve admin page (inject key placeholder if needed)
// -------------------------
app.get("/admin-create-contractor.html", (req, res) => {
  try {
    const p = path.join(process.cwd(), "admin-create-contractor.html");
    if (!fs.existsSync(p)) return res.status(404).send("Not found");
    let html = fs.readFileSync(p, "utf8");
    // inject admin key placeholder for page (not secure — page will POST header with key)
    html = html.replace("{{ADMIN_PORTAL_KEY}}", ADMIN_PORTAL_KEY || "");
    res.type("html").send(html);
  } catch (e) {
    res.status(500).send("Error reading admin page");
  }
});

// -------------------------
// ADMIN: create contractor (admin key required)
// Expects JSON: { company, phone, password, telegram }
// -------------------------
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"] || req.query.key || "";
    if (!ADMIN_PORTAL_KEY || adminKey !== ADMIN_PORTAL_KEY) {
      return res.status(401).json({ ok: false, error: "Unauthorized (admin key)" });
    }

    const { company, phone, password, telegram } = req.body;
    if (!company || !phone || !password) return res.json({ ok: false, error: "company, phone, password required" });

    // hash password
    const password_hash = await bcrypt.hash(password, 10);

    // insert into contractors table (use supabase if configured)
    if (supabase) {
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
        .select()
        .maybeSingle();

      if (error) return res.json({ ok: false, error: error.message });
      return res.json({ ok: true, contractor: data });
    } else {
      // fallback: write to file data/contractors.json
      const file = path.join(process.cwd(), "data", "contractors.json");
      const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : { contractors: [] };
      const rec = { id: `local-${Date.now()}`, company, phone, password_hash, telegram_chat_id: telegram || null, created_at: new Date().toISOString() };
      arr.contractors.unshift(rec);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(arr, null, 2));
      return res.json({ ok: true, contractor: rec });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// -------------------------
// CONTRACTOR LOGIN (phone + password)
// returns contractor row (no JWT). Frontend stores contractor.id in localStorage for subsequent calls.
// -------------------------
app.post("/api/contractor/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ ok: false, error: "phone and password required" });

    if (supabase) {
      const { data: contractor, error } = await supabase.from("contractors").select("*").eq("phone", phone).maybeSingle();
      if (error || !contractor) return res.status(400).json({ ok: false, error: "Contractor not found" });

      const ok = await bcrypt.compare(password, contractor.password_hash || "");
      if (!ok) return res.status(401).json({ ok: false, error: "Invalid password" });

      return res.json({ ok: true, contractor });
    } else {
      const file = path.join(process.cwd(), "data", "contractors.json");
      if (!fs.existsSync(file)) return res.status(400).json({ ok: false, error: "No contractors configured" });
      const arr = JSON.parse(fs.readFileSync(file)).contractors || [];
      const contractor = arr.find(c => c.phone === phone);
      if (!contractor) return res.status(400).json({ ok: false, error: "Contractor not found" });
      const ok = await bcrypt.compare(password, contractor.password_hash || "");
      if (!ok) return res.status(401).json({ ok: false, error: "Invalid password" });
      return res.json({ ok: true, contractor });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// -------------------------
// GET contractors (public)
// -------------------------
app.get("/api/contractors", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from("contractors").select("id,company,phone,telegram_chat_id,logo_url,service,badge,created_at").order("created_at", { ascending: false }).limit(500);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, contractors: data });
    } else {
      const file = path.join(process.cwd(), "data", "contractors.json");
      if (!fs.existsSync(file)) return res.json({ ok: true, contractors: [] });
      const arr = JSON.parse(fs.readFileSync(file)).contractors || [];
      return res.json({ ok: true, contractors: arr });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// -------------------------
// POST lead -> save + telegram notify (admin or contractor)
// payload: { name, phone, email, service, message, contractorId, source }
// -------------------------
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractorId, source } = req.body;
    if (!name || !phone || !service) return res.status(400).json({ ok: false, error: "name, phone, service required" });

    const row = {
      name,
      phone,
      email: email || null,
      service,
      message: message || null,
      contractor_id: contractorId || null,
      source: source || "web",
      created_at: new Date().toISOString()
    };

    let saved = null;
    if (supabase) {
      const { data, error } = await supabase.from("leads").insert([row]).select().maybeSingle();
      if (error) console.warn("Lead save error:", error.message);
      else saved = data;
    } else {
      const file = path.join(process.cwd(), "data", "leads.json");
      const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      arr.unshift(row);
      fs.writeFileSync(file, JSON.stringify(arr, null, 2));
      saved = row;
    }

    // notify: if contractorId and contractor has telegram_chat_id => send there; else admin
    let chatTarget = TELEGRAM_CHAT_ID_ADMIN || null;
    if (contractorId && supabase) {
      const { data: c } = await supabase.from("contractors").select("telegram_chat_id,company").eq("id", contractorId).maybeSingle();
      if (c && c.telegram_chat_id) chatTarget = c.telegram_chat_id;
    } else if (contractorId && !supabase) {
      const file = path.join(process.cwd(), "data", "contractors.json");
      const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)).contractors : [];
      const c = arr.find(x => x.id === contractorId);
      if (c && c.telegram_chat_id) chatTarget = c.telegram_chat_id;
    }

    const txt = `📩 *New Lead*\n*Name:* ${name}\n*Phone:* ${phone}\n*Service:* ${service}\n*Message:* ${message || "-" }\n*Source:* ${source || "web"}`;
    if (chatTarget) await notifyTelegram(chatTarget, txt);

    return res.json({ ok: true, lead: saved });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// -------------------------
// POST message (contractor -> admin chat)
// { contractorId, message }
// -------------------------
app.post("/api/message", async (req, res) => {
  try {
    const { contractorId, message } = req.body;
    if (!contractorId || !message) return res.status(400).json({ ok: false, error: "contractorId and message required" });

    const row = { contractor_id: contractorId, message, created_at: new Date().toISOString() };

    if (supabase) {
      const { data, error } = await supabase.from("messages").insert([row]).select().maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      // notify admin
      await notifyTelegram(TELEGRAM_CHAT_ID_ADMIN, `💬 Message from contractor ${contractorId}:\n${message}`);
      return res.json({ ok: true, message: data });
    } else {
      const file = path.join(process.cwd(), "data", "messages.json");
      const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      arr.unshift(row);
      fs.writeFileSync(file, JSON.stringify(arr, null, 2));
      await notifyTelegram(TELEGRAM_CHAT_ID_ADMIN, `💬 Message from contractor ${contractorId}:\n${message}`);
      return res.json({ ok: true, message: row });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// -------------------------
// GET contractor leads (private-ish) - expects x-contractor-id header
// -------------------------
app.get("/api/my/leads", async (req, res) => {
  try {
    const contractorId = req.headers["x-contractor-id"] || req.query.contractorId;
    if (!contractorId) return res.status(400).json({ ok: false, error: "missing contractor id header" });

    if (supabase) {
      const { data, error } = await supabase.from("leads").select("*").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(500);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, leads: data });
    } else {
      const file = path.join(process.cwd(), "data", "leads.json");
      const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      const filtered = arr.filter(l => l.contractor_id === contractorId);
      return res.json({ ok: true, leads: filtered });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// -------------------------
// GET contractor messages (private-ish)
// -------------------------
app.get("/api/my/messages", async (req, res) => {
  try {
    const contractorId = req.headers["x-contractor-id"] || req.query.contractorId;
    if (!contractorId) return res.status(400).json({ ok: false, error: "missing contractor id header" });

    if (supabase) {
      const { data, error } = await supabase.from("messages").select("*").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(500);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, messages: data });
    } else {
      const file = path.join(process.cwd(), "data", "messages.json");
      const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      const filtered = arr.filter(m => m.contractor_id === contractorId);
      return res.json({ ok: true, messages: filtered });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// -------------------------
// POST review with optional file upload (multipart/form-data) - review images stored in Supabase storage if available
// -------------------------
app.post("/api/review", async (req, res) => {
  try {
    const contractorId = req.body.contractor || req.body.contractor_id;
    const reviewer_name = req.body.name || req.body.reviewer_name || "Customer";
    const rating = Number(req.body.rating || 5);
    const comment = req.body.comment || "";
    const images = [];

    if (req.files) {
      for (const key of Object.keys(req.files)) {
        const file = req.files[key];
        if (supabase) {
          const filePath = `reviews/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
          const upload = await supabase.storage.from("contractor-assets").upload(filePath, file.data, { upsert: true, contentType: file.mimetype });
          if (!upload.error) {
            const url = supabase.storage.from("contractor-assets").getPublicUrl(filePath).data.publicUrl;
            images.push(url);
          }
        } else {
          // fallback: ignore file or save to /public/uploads
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          fs.mkdirSync(uploadsDir, { recursive: true });
          const outPath = path.join(uploadsDir, `${Date.now()}-${file.name.replace(/\s/g, "_")}`);
          fs.writeFileSync(outPath, file.data);
          images.push(`/uploads/${path.basename(outPath)}`);
        }
      }
    }

    const row = { contractor_id: contractorId || null, reviewer_name, rating, comment, images, created_at: new Date().toISOString() };

    if (supabase) {
      const { data, error } = await supabase.from("reviews").insert([row]).select().maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, review: data });
    } else {
      const file = path.join(process.cwd(), "data", "reviews.json");
      const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      arr.unshift(row);
      fs.writeFileSync(file, JSON.stringify(arr, null, 2));
      return res.json({ ok: true, review: row });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// catch-all 404
app.use((req, res) => res.status(404).send("Not found"));

// start
app.listen(PORT, () => {
  console.log(`OmniLead API running on ${PORT}`);
});
