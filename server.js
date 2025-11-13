/**
 * server.js - Restored & upgraded main server with Supabase integration
 *
 * - Writes to Supabase (leads, contractors, reviews) if available
 * - Falls back to JSON persistence in /data when Supabase fails
 * - File uploads saved to /uploads
 * - Endpoints:
 *   GET /api/services
 *   GET /api/contractors
 *   POST /api/contractor
 *   POST /api/lead
 *   POST /api/review (multipart)
 *   POST /api/message
 *   POST /api/apply-badge (adminSecret required)
 *   GET /api/logs/:name
 *
 * Env vars required for full Supabase integration:
 * - SUPABASE_URL  (e.g. https://obmbklanktevawuymkbq.supabase.co)
 * - SUPABASE_SERVICE_KEY  (service_role key - KEEP SECRET, set in Render env)
 * - BOT_TOKEN (telegram bot token) optional - if missing it uses fallback token
 * - ADMIN_CHAT_ID (your admin telegram id)
 * - ADMIN_SECRET (admin secret for protected endpoints)
 */

import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 10000;

/* --- CONFIG --- */
const BOT_TOKEN = process.env.BOT_TOKEN || "8526401033:AAFrG8IH8xqQL_RTD7s7JLyxZpc8e8GOyyg";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8187670531";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "omni$admin_2025_KEY!@34265346597843152";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://obmbklanktevawuymkbq.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || null; // set this in Render

/* --- DATA PATHS --- */
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const ASSETS_DIR = path.join(__dirname, "assets");
const BADGES_DIR = path.join(__dirname, "badges");

/* ensure directories */
for (const d of [DATA_DIR, UPLOADS_DIR, ASSETS_DIR, BADGES_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/* basic fs JSON helpers (fallback storage) */
function readJSON(name) {
  const f = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch(e){ console.error("readJSON", e); return []; }
}
function writeJSON(name, data) {
  const f = path.join(DATA_DIR, name + ".json");
  fs.writeFileSync(f, JSON.stringify(data, null, 2));
}
function appendLog(name, obj) {
  const arr = readJSON(name);
  arr.unshift({ ts: new Date().toISOString(), ...obj });
  writeJSON(name, arr.slice(0, 5000));
}

/* multer upload config */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req,file,cb) => cb(null, UPLOADS_DIR),
    filename: (req,file,cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.originalname.replace(/\s+/g,'_')}`)
  }),
  limits: { fileSize: 12 * 1024 * 1024 }
});

/* --- Supabase server client (use service key on server only) --- */
let supabase = null;
if (SUPABASE_SERVICE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    console.log("Supabase service client initialized.");
  } catch (e) {
    console.warn("Supabase init failed, continuing with JSON fallback.", e);
    supabase = null;
  }
} else {
  console.warn("SUPABASE_SERVICE_KEY not set — Supabase disabled (will use local JSON).");
}

/* helper to send Telegram message */
async function sendTelegram(token, chatId, text) {
  if (!token || !chatId) return { ok:false, error: "missing token/chat" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: "HTML" })
    });
    return await res.json();
  } catch (err) {
    console.error("sendTelegram error", err);
    return { ok:false, error: String(err) };
  }
}

/* --- Ensure services list exists (same as before) --- */
function ensureServices() {
  const p = path.join(DATA_DIR, "services.json");
  if (fs.existsSync(p)) return;
  const templates = {
    "Property & Maintenance": ["Roof Repair","Gutter Cleaning","Plumbing Repair","Drain Unblock","Tiling","Interior Painting","Exterior Painting","Plastering","Carpentry","Window Repair","Fence Repair","Concrete Repair","Leak Detection","Damp Proofing","Locksmith"],
    "Cleaning & Hygiene": ["House Cleaning - Standard","House Cleaning - Deep","Office Cleaning","End of Lease Clean","Carpet Steam Clean","Curtain Cleaning","Window Cleaning","Sanitization & Disinfection","Tile & Grout Clean","Upholstery Cleaning"],
    "Security & Energy": ["CCTV Installation","CCTV Maintenance","Alarm System Installation","Electric Fence Installation","Gate Motor","Access Control","Intercom Install","Battery Backup","Energy Audit"],
    "Outdoor & Garden": ["Lawn Mowing","Garden Maintenance","Tree Pruning","Tree Felling","Hedge Trimming","Irrigation Install","Landscape Design","Paving & Patio"],
    "Appliances & Repairs": ["Fridge Repair","Washing Machine Repair","Dryer Repair","Oven Repair","Dishwasher Repair","Microwave Repair"],
    "Electrical": ["Light Fitting Install","Switch & Socket Repair","Full Rewire","Partial Rewire","Electrical Inspection","Ceiling Fan Install"],
    "Plumbing": ["Toilet Install/Replace","Hot Water Repair","Hot Water Replace","Burst Pipe Repair","Tap Replacement","Bathroom Fitting"],
    "Handyman": ["Flat Pack Assembly","Shelving Install","Picture Hanger Install","Odd Jobs"],
    "Renovation": ["Kitchen Renovation","Bathroom Renovation","Flooring Install","Structural Repair","Tiling"]
  };
  const services = [];
  let id = 1;
  for (const [cat, arr] of Object.entries(templates)) {
    arr.forEach(n => services.push({ id: `s-${id++}`, cat, name: n }));
  }
  while (services.length < 220) {
    const cats = Object.keys(templates);
    const c = cats[Math.floor(Math.random()*cats.length)];
    services.push({ id: `s-${id++}`, cat: c, name: `${c.split(" ")[0]} Specialist ${id}` });
  }
  writeJSON("services", services);
}
ensureServices();

/* --- Express app --- */
const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/assets", express.static(ASSETS_DIR));
app.use("/badges", express.static(BADGES_DIR));

/* --- Utility: try write to supabase, fallback to JSON --- */
async function saveContractorToSupabase(record) {
  if (!supabase) throw new Error("no supabase");
  const { data, error } = await supabase.from("contractors").upsert(record).select();
  if (error) throw error;
  return data;
}
async function saveLeadToSupabase(record) {
  if (!supabase) throw new Error("no supabase");
  const { data, error } = await supabase.from("leads").insert(record).select();
  if (error) throw error;
  return data;
}
async function saveReviewToSupabase(record) {
  if (!supabase) throw new Error("no supabase");
  const { data, error } = await supabase.from("reviews").insert(record).select();
  if (error) throw error;
  return data;
}

/* --- API: GET /api/services --- */
app.get("/api/services", (req,res) => {
  const services = readJSON("services");
  const cat = req.query.cat;
  if (cat) return res.json({ ok:true, services: services.filter(s => s.cat === cat) });
  res.json({ ok:true, services });
});

/* --- API: GET /api/contractors --- */
app.get("/api/contractors", async (req,res) => {
  // Try supabase first for latest data
  if (supabase) {
    try {
      const { data, error } = await supabase.from("contractors").select("*").order('created', { ascending: false }).limit(1000);
      if (!error && data) return res.json({ ok:true, contractors: data });
    } catch (e) {
      console.warn("supabase contractors read failed", e);
    }
  }
  const contractors = readJSON("contractors");
  res.json({ ok:true, contractors });
});

/* --- API: POST /api/contractor - create/update contractor --- */
app.post("/api/contractor", async (req,res) => {
  try {
    const c = req.body;
    // ensure id
    if (!c.id) c.id = `ct-${Date.now()}`;
    c.updated = new Date().toISOString();

    // Attempt to write to supabase
    if (supabase) {
      try {
        await saveContractorToSupabase(c);
        appendLog("contractors", { action: "upsert-supabase", contractor: c });
        return res.json({ ok:true, provider: "supabase", contractor: c });
      } catch (err) {
        console.warn("supabase contractor upsert failed, falling back to json", err);
      }
    }

    // fallback JSON
    const contractors = readJSON("contractors");
    const idx = contractors.findIndex(x => x.id === c.id || (c.phone && x.phone === c.phone));
    if (idx > -1) contractors[idx] = { ...contractors[idx], ...c };
    else contractors.unshift(c);
    writeJSON("contractors", contractors);
    appendLog("contractors", { action: "upsert-json", contractor: c });
    return res.json({ ok:true, provider: "json", contractor: c });
  } catch (err) {
    console.error("contractor upsert", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

/* --- API: POST /api/lead - save lead, notify admin & contractor --- */
app.post("/api/lead", async (req,res) => {
  try {
    const payload = req.body || {};
    const record = {
      name: payload.name || "",
      phone: payload.phone || "",
      email: payload.email || "",
      service: payload.service || payload.details || "",
      message: payload.message || payload.details || "",
      contractor_id: payload.contractorId || payload.contractor_id || null,
      created_at: new Date().toISOString()
    };

    // attempt supabase insert
    if (supabase) {
      try {
        await saveLeadToSupabase({
          contractor_id: record.contractor_id,
          name: record.name,
          phone: record.phone,
          email: record.email,
          service: record.service,
          message: record.message,
          created_at: record.created_at
        });
        appendLog("leads", { action: "insert-supabase", record });
      } catch (e) {
        console.warn("supabase lead insert failed, falling back to json", e);
        appendLog("leads", { action: "insert-json-fallback", record });
        const leads = readJSON("leads"); leads.unshift(record); writeJSON("leads", leads);
      }
    } else {
      // no supabase — save locally
      appendLog("leads", { action: "insert-json", record });
      const leads = readJSON("leads"); leads.unshift(record); writeJSON("leads", leads);
    }

    // build telegram text
    const text = [
      "<b>📩 New Lead</b>",
      `👤 ${record.name || "-"}`,
      `📞 ${record.phone || "-"}`,
      record.service ? `🛠 ${record.service}` : "",
      record.message ? `💬 ${record.message.length>300 ? record.message.slice(0,300)+"..." : record.message}` : "",
      record.email ? `📧 ${record.email}` : "",
      `⏱ ${new Date().toLocaleString()}`
    ].filter(Boolean).join("\n");

    // send to admin bot
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      try { await sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, text); } catch(e){ console.warn("admin tg send err", e); }
    }

    // forward to contractor if they have telegram creds saved in DB or JSON
    let contractorObj = null;
    if (supabase) {
      try {
        const { data } = await supabase.from("contractors").select("id,telegram_token,telegram_chat_id,telegram_bot_username,phone,email").eq("id", record.contractor_id).limit(1);
        if (data && data[0]) contractorObj = data[0];
      } catch(e){ console.warn("supabase find contractor failed", e); }
    }
    if (!contractorObj) {
      const contractors = readJSON("contractors");
      contractorObj = contractors.find(c => c.id === record.contractor_id || c.phone === record.contractor_id);
    }

    if (contractorObj) {
      const ctToken = contractorObj.telegram_token || contractorObj.telegramToken || contractorObj.telegramBot || null;
      const ctChat = contractorObj.telegram_chat_id || contractorObj.telegramChatId || contractorObj.telegramChat || contractorObj.telegram_chat || null;
      if (ctToken && ctChat) {
        try { await sendTelegram(ctToken, ctChat, text); } catch(e){ console.warn("contractor tg send err", e); }
      }
    }

    return res.json({ ok:true });
  } catch (err) {
    console.error("lead err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* --- POST /api/review with images --- */
app.post("/api/review", upload.array("images", 8), async (req,res) => {
  try {
    const { contractor, name, rating, comment } = req.body;
    const images = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
    const record = {
      contractor_id: contractor,
      reviewer: name || "Anonymous",
      stars: Number(rating||0),
      comment: comment||"",
      images,
      created_at: new Date().toISOString()
    };

    // try supabase insert
    if (supabase) {
      try {
        await saveReviewToSupabase({
          contractor_id: record.contractor_id,
          reviewer: record.reviewer,
          stars: record.stars,
          comment: record.comment,
          images: record.images,
          created_at: record.created_at
        });
        appendLog("reviews", { action: "insert-supabase", record });
      } catch (e) {
        console.warn("supabase review insert failed, falling back to json", e);
        appendLog("reviews", { action: "insert-json-fallback", record });
        const reviews = readJSON("reviews"); reviews.unshift(record); writeJSON("reviews", reviews);
      }
    } else {
      appendLog("reviews", { action: "insert-json", record });
      const reviews = readJSON("reviews"); reviews.unshift(record); writeJSON("reviews", reviews);
    }

    res.json({ ok:true, images });
  } catch (err) {
    console.error("review err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* --- POST /api/message contractor->admin --- */
app.post("/api/message", async (req,res) => {
  try {
    const { contractorId, message } = req.body;
    appendLog("messages", { contractorId, message });
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      try { await sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, `<b>Message from Contractor</b>\nID: ${contractorId}\n${message}`); } catch(e){ console.warn("tg message err", e); }
    }
    res.json({ ok:true });
  } catch (err) {
    console.error("message err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* --- POST /api/apply-badge - admin action --- */
app.post("/api/apply-badge", async (req,res) => {
  try {
    const { adminSecret, contractorId, badge } = req.body;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) return res.status(401).json({ ok:false, error: "unauthorized" });

    // try supabase update
    if (supabase) {
      try {
        const { data, error } = await supabase.from("contractors").update({ badge, badge_assigned_at: new Date().toISOString() }).eq("id", contractorId).select();
        if (error) throw error;
        appendLog("contractors", { action:"apply-badge-supabase", contractorId, badge });
        return res.json({ ok:true, contractor: data && data[0] });
      } catch (e) {
        console.warn("supabase apply badge failed", e);
      }
    }

    // fallback JSON update
    const contractors = readJSON("contractors");
    const idx = contractors.findIndex(c => c.id === contractorId || c.phone === contractorId);
    if (idx === -1) return res.status(404).json({ ok:false, error: "contractor not found" });
    contractors[idx].badge = badge;
    contractors[idx].badgeAssignedAt = new Date().toISOString();
    writeJSON("contractors", contractors);
    appendLog("contractors", { action: "apply-badge-json", contractorId, badge });
    res.json({ ok:true, contractor: contractors[idx] });
  } catch (err) {
    console.error("apply-badge", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/* --- GET logs for admin or debugging --- */
app.get("/api/logs/:name", (req,res) => {
  const arr = readJSON(req.params.name);
  res.json(arr);
});

/* --- helper admin secret check (for UI) --- */
app.get("/api/admin-secret", (req,res) => {
  res.json({ ok:true, secret: !!ADMIN_SECRET });
});

/* static fallback (serve files) */
app.use((req,res)=>{
  const file = path.join(__dirname, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
  res.status(404).send("Not found");
});

/* listen */
app.listen(PORT, ()=>console.log(`🚀 Server running on port ${PORT}`));
