/**
 * server.js — Service Point Solutions
 * Auth: email OR phone + password + 3-digit PIN
 * Admin auth: env ADMIN_EMAIL / ADMIN_PASSWORD
 *
 * Save this as server.js in project root.
 */

import express from "express";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 10000;

// Supabase (optional)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("Supabase client created.");
}

// Env / config
const JWT_SECRET = process.env.JWT_SECRET || "change_this_jwt_secret";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";
const BASE_URL = process.env.BASE_URL || "";

// Data dirs
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// JSON helpers
function readJSON(name) {
  const file = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch(e){ console.error("readJSON", e); return []; }
}
function writeJSON(name, data) {
  const file = path.join(DATA_DIR, name + ".json");
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function appendLog(name, obj) {
  const arr = readJSON(name);
  arr.unshift({ ts: new Date().toISOString(), ...obj });
  writeJSON(name, arr.slice(0, 5000));
}

// Multer
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));
app.use("/uploads", express.static(UPLOADS_DIR));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { ok:false, error: "Too many attempts" }});
const leadLimiter = rateLimit({ windowMs: 5*60*1000, max: 60, message: { ok:false, error: "Too many requests" }});

// Helpers
async function sendTelegram(token, chatId, text) {
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: "HTML" })
    });
  } catch (err) { console.error("sendTelegram", err); }
}

async function uploadToSupabase(bucket, fileBuffer, fileName, mime) {
  if (!supabase) return null;
  const filePath = `${Date.now()}-${fileName.replace(/\s+/g,'_')}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, { contentType: mime });
  if (error) { console.error("supabase upload error", error); return null; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

// Auth helpers
const SALT_ROUNDS = 10;
async function hashPassword(p){ return bcrypt.hash(p, SALT_ROUNDS); }
async function comparePassword(p, h){ try { return await bcrypt.compare(p, h); } catch { return false; } }
function signToken(payload, expiresIn="7d"){ return jwt.sign(payload, JWT_SECRET, { expiresIn, issuer: "service-point" }); }
function verifyToken(token){ try { return jwt.verify(token, JWT_SECRET, { issuer: "service-point" }); } catch(e){ return null; } }

function authenticate(req,res,next){
  const token = req.cookies?.token || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ ok:false, error:"unauthenticated" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ ok:false, error:"invalid token" });
  req.user = payload;
  next();
}
function requireAdmin(req,res,next){
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ ok:false, error:"forbidden" });
  next();
}

/* ---------- Ensure services fallback ---------- */
function ensureServices() {
  const file = path.join(DATA_DIR, "services.json");
  if (fs.existsSync(file)) return;
  const templates = [
    { cat: "Property & Maintenance", name: "Roof Repair" },
    { cat: "Cleaning & Hygiene", name: "House Cleaning - Standard" },
    { cat: "Security & Energy", name: "CCTV Installation" },
    { cat: "Outdoor & Garden", name: "Lawn Mowing" },
    { cat: "Appliances & Repairs", name: "Fridge Repair" },
    { cat: "Electrical", name: "Light Fitting Install" }
  ];
  const services = [];
  let id = 1;
  for (const t of templates) services.push({ id: `s-${id++}`, cat: t.cat, name: t.name });
  const cats = [...new Set(services.map(s=>s.cat))];
  while (services.length < 220) {
    const c = cats[Math.floor(Math.random()*cats.length)];
    services.push({ id: `s-${id++}`, cat: c, name: `${c.split(" ")[0]} Specialist ${id}` });
  }
  writeJSON("services", services);
}
ensureServices();

/* =================== API =================== */

/* GET /api/services */
app.get("/api/services", async (req,res) => {
  if (supabase) {
    try { const { data } = await supabase.from("services").select("*"); return res.json({ ok:true, services: data }); } catch(e) {}
  }
  return res.json({ ok:true, services: readJSON("services") });
});

/* GET /api/contractor/:id -> public contractor + reviews */
app.get("/api/contractor/:id", async (req,res) => {
  const id = req.params.id;
  if (supabase) {
    try {
      const { data: contractor } = await supabase.from("contractors").select("*").eq("id", id).single();
      const { data: reviews } = await supabase.from("reviews").select("*").eq("contractor_id", id);
      return res.json({ ok:true, contractor, reviews });
    } catch(e){ console.warn("supabase fetch err", e); }
  }
  const contractors = readJSON("contractors");
  const contractor = contractors.find(c=>c.id===id);
  const reviews = readJSON("reviews").filter(r=>r.contractor_id===id);
  res.json({ ok:true, contractor, reviews });
});

/* POST /api/contractor -> create/update (registration) */
/* Requires body: email or phone, password, pin (3-digit). */
app.post("/api/contractor", async (req,res) => {
  try {
    const payload = { ...req.body };
    // validation
    const hasEmail = !!payload.email;
    const hasPhone = !!payload.phone;
    if (!hasEmail && !hasPhone) return res.status(400).json({ ok:false, error:"Provide email or phone" });
    if (!payload.password || !payload.pin) return res.status(400).json({ ok:false, error:"Missing password or pin" });
    if (!/^\d{3}$/.test(String(payload.pin))) return res.status(400).json({ ok:false, error:"PIN must be 3 digits" });

    // hash password & pin unless already hashed (starts with $2)
    if (!/^(\$2[aby]\$)/.test(payload.password)) payload.password = await hashPassword(payload.password);
    if (!/^(\$2[aby]\$)/.test(payload.pin)) payload.pin = await hashPassword(String(payload.pin));

    // Supabase upsert attempt
    if (supabase) {
      try { await supabase.from("contractors").upsert([{ ...payload, updated_at: new Date() }]); } catch(e){ console.warn(e); }
    }

    // JSON fallback: upsert by email or phone
    const arr = readJSON("contractors");
    const idx = arr.findIndex(x => (payload.email && x.email === payload.email) || (payload.phone && x.phone === payload.phone));
    let saved;
    if (idx > -1) { arr[idx] = { ...arr[idx], ...payload, updated: new Date().toISOString() }; saved = arr[idx]; }
    else { saved = { id: payload.id || `ct-${Date.now()}`, ...payload, created: new Date().toISOString() }; arr.unshift(saved); }
    writeJSON("contractors", arr);
    appendLog("contractors", { action:"upsert", payload: { id: saved.id, email: saved.email, phone: saved.phone } });

    const toReturn = { ...saved }; delete toReturn.password; delete toReturn.pin;
    return res.json({ ok:true, contractor: toReturn });
  } catch (err) {
    console.error("contractor upsert err", err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
});

/* POST /api/login
   Accepts body:
   { email (optional), phone (optional), password, pin }
   Returns cookie token + contractor info
*/
app.post("/api/login", authLimiter, async (req,res) => {
  try {
    const { email, phone, password, pin, remember } = req.body;
    if ((!email && !phone) || !password || !pin) return res.status(400).json({ ok:false, error:"Missing login fields" });

    // find user
    let contractor = null;
    if (supabase) {
      try {
        const q = email ? supabase.from("contractors").select("*").eq("email", email).maybeSingle() : supabase.from("contractors").select("*").eq("phone", phone).maybeSingle();
        const { data } = await q;
        if (data) contractor = data;
      } catch(e){ console.warn("supabase login err", e); }
    }

    if (!contractor) {
      const list = readJSON("contractors");
      contractor = list.find(c => (email && c.email?.toLowerCase() === String(email).toLowerCase()) || (phone && c.phone === phone));
    }

    if (!contractor) return res.status(401).json({ ok:false, error:"Invalid credentials" });

    // compare password & pin
    const passMatch = await comparePassword(password, contractor.password || "");
    const pinMatch = await comparePassword(String(pin), contractor.pin || "");
    if (!passMatch || !pinMatch) return res.status(401).json({ ok:false, error:"Invalid credentials" });

    const payload = { id: contractor.id, email: contractor.email || null, role: "contractor" };
    const expiresIn = remember ? "30d" : "7d";
    const token = signToken(payload, expiresIn);

    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: remember ? 30*24*3600*1000 : 7*24*3600*1000 });

    const ret = { ...contractor }; delete ret.password; delete ret.pin;
    return res.json({ ok:true, contractor: ret, tokenValidFor: expiresIn });
  } catch (err) {
    console.error("login err", err);
    return res.status(500).json({ ok:false, error:"Server error" });
  }
});

/* POST /api/lead - save lead and notify */
app.post("/api/lead", leadLimiter, async (req,res) => {
  try {
    const { name, phone, email, service, message, contractor_id } = req.body;
    if (supabase) {
      try { await supabase.from("leads").insert([{ customer_name: name, phone, email, service, message, contractor_id }]); } catch(e){ console.warn(e); }
    }
    appendLog("leads", { name, phone, email, service, message, contractor_id });

    const text = ["<b>📩 New Lead</b>", `👤 ${name||"-"}`, `📞 ${phone||"-"}`, service?`🛠 ${service}`:"", message?`💬 ${message}`:"", email?`📧 ${email}`:"", `⏱ ${new Date().toLocaleString()}`].filter(Boolean).join("\n");

    if (BOT_TOKEN && ADMIN_CHAT_ID) await sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, text).catch(()=>{});

    // Attempt to notify contractor via stored telegram settings (if present)
    if (contractor_id) {
      const contractors = supabase ? (await supabase.from("contractors").select("*").eq("id", contractor_id)).data : readJSON("contractors");
      const c = Array.isArray(contractors) ? contractors[0] : contractors;
      if (c && c.telegram_token && c.telegram_chat_id) await sendTelegram(c.telegram_token, c.telegram_chat_id, text).catch(()=>{});
    }

    return res.json({ ok:true });
  } catch (err) { console.error("lead err", err); return res.status(500).json({ ok:false, error: String(err) }); }
});

/* POST /api/review (multipart) */
app.post("/api/review", upload.array("images", 8), async (req,res) => {
  try {
    const { contractor_id, name, rating, comment } = req.body;
    const images = [];
    for (const f of req.files || []) {
      let url = null;
      if (supabase) url = await uploadToSupabase("reviews", f.buffer, f.originalname, f.mimetype);
      if (!url) {
        const localName = `${Date.now()}-${f.originalname.replace(/\s+/g,'_')}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, localName), f.buffer);
        url = `/uploads/${localName}`;
      }
      images.push(url);
    }
    if (supabase) { try { await supabase.from("reviews").insert([{ contractor_id, reviewer_name: name, rating: Number(rating||0), comment, images }]); } catch(e){ console.warn("supabase review insert", e); } }
    appendLog("reviews", { contractor_id, name, rating: Number(rating||0), comment, images });
    return res.json({ ok:true, images });
  } catch (err) { console.error("review err", err); return res.status(500).json({ ok:false, error: String(err) }); }
});

/* POST /api/message */
app.post("/api/message", async (req,res) => {
  try {
    const { contractor_id, message } = req.body;
    appendLog("messages", { contractor_id, message });
    if (BOT_TOKEN && ADMIN_CHAT_ID) await sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, `<b>Message from Contractor</b>\nID: ${contractor_id}\n${message}`);
    return res.json({ ok:true });
  } catch(err) { console.error("message err", err); return res.status(500).json({ ok:false, error: String(err) }); }
});

/* GET /api/contractors */
app.get("/api/contractors", async (req,res) => {
  if (supabase) {
    try { const { data } = await supabase.from("contractors").select("*"); return res.json({ ok:true, contractors: data }); } catch(e){ console.warn(e); }
  }
  return res.json({ ok:true, contractors: readJSON("contractors") });
});

/* Admin login endpoint (env-based) */
app.post("/api/admin-login", authLimiter, async (req,res) => {
  try {
    const { email, password } = req.body;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return res.json({ ok:false, error:"Admin not configured" });
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) return res.json({ ok:false, error:"Invalid admin credentials" });
    const token = signToken({ role: "admin", email: ADMIN_EMAIL });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
    return res.json({ ok:true });
  } catch(err){ console.error(err); return res.status(500).json({ ok:false, error:"Server error" }); }
});

/* Admin endpoints: delete contractor, delete lead, block user, verify contractor, analytics, logs */
app.delete("/api/contractor/:id", authenticate, requireAdmin, async (req,res) => {
  try {
    const id = req.params.id;
    if (supabase) {
      try { await supabase.from("contractors").delete().eq("id", id); } catch(e){ console.warn(e); }
    }
    let arr = readJSON("contractors");
    const before = arr.length;
    arr = arr.filter(c => c.id !== id);
    writeJSON("contractors", arr);
    appendLog("admin_actions", { action:"delete-contractor", id });
    return res.json({ ok:true, removed: before - arr.length });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false, error: String(err) }); }
});

app.delete("/api/lead", authenticate, requireAdmin, async (req,res) => {
  try {
    const { ts } = req.body;
    if (!ts) return res.status(400).json({ ok:false, error: "Missing ts" });
    if (supabase) {
      try { await supabase.from("leads").delete().eq("created_at", ts); } catch(e){ /* ignore */ }
    }
    let arr = readJSON("leads");
    const before = arr.length;
    arr = arr.filter(l => l.ts !== ts);
    writeJSON("leads", arr);
    appendLog("admin_actions", { action:"delete-lead", ts });
    return res.json({ ok:true, removed: before - arr.length });
  } catch(err) { console.error(err); return res.status(500).json({ ok:false, error: String(err) }); }
});

app.post("/api/block-user", authenticate, requireAdmin, async (req,res) => {
  try {
    const { phone, email, reason } = req.body;
    if (!phone && !email) return res.status(400).json({ ok:false, error: "Provide phone or email" });
    const blocked = readJSON("blocked");
    blocked.unshift({ phone, email, reason, ts: new Date().toISOString(), admin: req.user.email || "admin" });
    writeJSON("blocked", blocked);
    appendLog("admin_actions", { action:"block-user", phone, email, reason, by: req.user.email });
    return res.json({ ok:true });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false, error: String(err) }); }
});

app.post("/api/verify-contractor", authenticate, requireAdmin, async (req,res) => {
  try {
    const { contractor_id, verify } = req.body;
    if (!contractor_id) return res.status(400).json({ ok:false, error: "Missing contractor_id" });
    if (supabase) {
      try { await supabase.from("contractors").update({ verified: !!verify }).eq("id", contractor_id); } catch(e){ console.warn(e); }
    }
    const arr = readJSON("contractors");
    const idx = arr.findIndex(c => c.id === contractor_id);
    if (idx > -1) { arr[idx].verified = !!verify; writeJSON("contractors", arr); }
    appendLog("admin_actions", { action: "verify-contractor", contractor_id, verify, by: req.user.email });
    return res.json({ ok:true, verified: !!verify });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false, error: String(err) }); }
});

app.get("/api/analytics", authenticate, requireAdmin, async (req,res) => {
  try {
    const contractors = supabase ? await (async ()=>{ try { const { data } = await supabase.from("contractors").select("*"); return data; } catch(e){ return readJSON("contractors"); } })() : readJSON("contractors");
    const leads = supabase ? await (async ()=>{ try { const { data } = await supabase.from("leads").select("*"); return data; } catch(e){ return readJSON("leads"); } })() : readJSON("leads");
    const reviews = readJSON("reviews");
    // 7-day series
    const seriesDays = [];
    for (let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); seriesDays.push(d.toISOString().slice(0,10)); }
    const leadsSeries = seriesDays.map(day => leads.filter(l => { const t = l.ts || l.created_at || l.created || l.date; if (!t) return false; return (t.slice(0,10) === day); }).length);
    const contractorsSeries = seriesDays.map(day => contractors.filter(c => { const t = c.created_at || c.created || c.createdAt; if (!t) return false; return (t.slice(0,10) === day); }).length);
    return res.json({ ok:true, totals: { contractors: contractors.length, leads: leads.length, reviews: reviews.length }, series: { days: seriesDays, leads: leadsSeries, contractors: contractorsSeries }});
  } catch (err) { console.error(err); return res.status(500).json({ ok:false, error: String(err) }); }
});

/* GET logs (admin) */
app.get("/api/logs/:name", authenticate, requireAdmin, (req,res) => {
  res.json(readJSON(req.params.name));
});

/* Static fallback: serve files or 404 */
app.use((req,res)=>{
  const file = path.join(__dirname, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
  res.status(404).send("Not found");
});

app.listen(PORT, ()=>console.log(`🚀 Server running on port ${PORT}`));



