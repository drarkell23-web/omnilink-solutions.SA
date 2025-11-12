/**
 * server.js
 * OmniLink Solutions - Render-ready server
 *
 * - Serves static site files (index.html, admin-dashboard.html, contractor-dashboard.html, theme.css, etc.)
 * - API endpoints:
 *    POST /api/lead         -> sends lead to admin + contractor (if contractor token/id provided)
 *    POST /api/contractor   -> sends contractor signup to admin + optional contractor welcome
 *    POST /api/review       -> accepts review + optional images
 *    POST /api/message      -> admin -> contractor message forward
 *    POST /api/set-override -> admin sets override token/chat (optional)
 * - Serves uploaded images under /uploads
 *
 * NOTE: For production, replace file-based storage with cloud storage & add authentication.
 */

import express from "express";
import path from "path";
import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Telegram/admin config
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";
const ADMIN_OVERRIDE_TOKEN = process.env.ADMIN_OVERRIDE_TOKEN || "";
const ADMIN_OVERRIDE_CHAT_ID = process.env.ADMIN_OVERRIDE_CHAT_ID || "";

// Admin secret to show admin login button (client-side check)
const ADMIN_SECRET = process.env.ADMIN_SECRET || "changeme";

// ensure data and uploads folders
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// basic JSON logging helper (append lightweight logs)
function appendLog(filename, obj) {
  const file = path.join(DATA_DIR, filename);
  let arr = [];
  try {
    if (fs.existsSync(file)) arr = JSON.parse(fs.readFileSync(file));
  } catch (e) { arr = []; }
  arr.unshift({ ts: new Date().toISOString(), ...obj });
  fs.writeFileSync(file, JSON.stringify(arr.slice(0, 1000), null, 2));
}

// send to a specific telegram bot
async function sendTelegramWithToken(token, chatId, text) {
  try {
    if (!token || !chatId) throw new Error("Missing token or chatId");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: "HTML" })
    });
    const data = await res.json();
    if (!data.ok) console.error("Telegram API error:", data);
    return data;
  } catch (err) {
    console.error("sendTelegramWithToken error:", err.message || err);
    return { ok: false, error: err.message || String(err) };
  }
}

// convenient send that uses admin BOT_TOKEN and override options
async function sendToAdminAndContractor({txt, contractorToken, contractorChatId}) {
  const results = { admin: null, overrideAdmin: null, contractor: null };

  // Primary admin send (BOT_TOKEN -> ADMIN_CHAT_ID)
  if (BOT_TOKEN && ADMIN_CHAT_ID) {
    results.admin = await sendTelegramWithToken(BOT_TOKEN, ADMIN_CHAT_ID, txt);
  }

  // Admin override: if provided, send to override bot/chat too
  if (ADMIN_OVERRIDE_TOKEN && ADMIN_OVERRIDE_CHAT_ID) {
    results.overrideAdmin = await sendTelegramWithToken(ADMIN_OVERRIDE_TOKEN, ADMIN_OVERRIDE_CHAT_ID, txt);
  }

  // Contractor send (their own bot + chat)
  if (contractorToken && contractorChatId) {
    results.contractor = await sendTelegramWithToken(contractorToken, contractorChatId, txt);
  }

  appendLog("sent_messages.json", { txt, results });
  return results;
}

// Middleware
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // serve static files from repo root
app.use("/uploads", express.static(UPLOADS_DIR)); // serve uploaded images

// Multer for image uploads (reviews)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.originalname.replace(/\s+/g,'_')}`;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB per file

// Root
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Admin file to check secret (so front-end can reveal button)
app.get("/api/admin-secret", (req, res) => {
  res.json({ ok: true, secret: ADMIN_SECRET ? true : false });
});

// POST /api/lead
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractorToken, contractorChatId } = req.body;
    const txt = [
      "<b>📩 New Lead</b>",
      `👤 Name: ${name || "-"}`,
      `📞 Phone: ${phone || "-"}`,
      email ? `📧 Email: ${email}` : "",
      `🛠 Service: ${service || "-"}`,
      message ? `💬 Message: ${message}` : "",
      `⏱ ${new Date().toLocaleString()}`
    ].filter(Boolean).join("\n");

    const results = await sendToAdminAndContractor({ txt, contractorToken, contractorChatId });
    appendLog("leads.json", { name, phone, email, service, message, contractorToken: !!contractorToken, contractorChatId: !!contractorChatId });
    res.json({ ok: true, results });
  } catch (err) {
    console.error("lead error", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/contractor
app.post("/api/contractor", async (req, res) => {
  try {
    const { name, company, phone, service, telegramToken, telegramChatId } = req.body;
    const txt = [
      "<b>🧰 New Contractor Signup</b>",
      `🏢 Company: ${company || "-"}`,
      `👷 Name: ${name || "-"}`,
      `📞 Phone: ${phone || "-"}`,
      `🛠 Service: ${service || "-"}`,
      telegramChatId ? `💬 ChatID: ${telegramChatId}` : ""
    ].filter(Boolean).join("\n");

    const results = await sendToAdminAndContractor({ txt, contractorToken: telegramToken, contractorChatId: telegramChatId });

    appendLog("contractors.json", { name, company, phone, service, telegramToken: !!telegramToken, telegramChatId: !!telegramChatId });
    res.json({ ok: true, results });
  } catch (err) {
    console.error("contractor error", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/review (supports images up to 5 files)
app.post("/api/review", upload.array("images", 5), async (req, res) => {
  try {
    const { contractor, name, rating, comment, contractorToken, contractorChatId } = req.body;
    const imageUrls = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);

    const txt = [
      "<b>⭐ New Review Submitted</b>",
      `👷 Contractor: ${contractor || "-"}`,
      `👤 Reviewer: ${name || "-"}`,
      `⭐ Rating: ${rating || "-"}`,
      comment ? `💬 Comment: ${comment}` : "",
      imageUrls.length ? `🖼 Images: ${imageUrls.join(", ")}` : ""
    ].filter(Boolean).join("\n");

    // notify admin + contractor
    const results = await sendToAdminAndContractor({ txt, contractorToken, contractorChatId });
    appendLog("reviews.json", { contractor, name, rating, comment, images: imageUrls });

    res.json({ ok: true, imageUrls, results });
  } catch (err) {
    console.error("review upload error", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/message (admin -> contractor)
app.post("/api/message", async (req, res) => {
  try {
    const { adminSecret, contractorToken, contractorChatId, message } = req.body;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: "unauthorized" });
    const txt = `<b>📣 Message from Admin</b>\n${message}\n${new Date().toLocaleString()}`;
    const results = await sendToAdminAndContractor({ txt, contractorToken, contractorChatId });
    appendLog("admin_messages.json", { message, contractorToken: !!contractorToken, contractorChatId: !!contractorChatId });
    res.json({ ok: true, results });
  } catch (err) {
    console.error("message error", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/set-override (admin sets override tokens) - optional convenience endpoint
app.post("/api/set-override", express.json(), (req, res) => {
  try {
    const { adminSecret, overrideToken, overrideChatId } = req.body;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: "unauthorized" });
    // Note: we don't mutate env variables here; in production update Render env variables.
    appendLog("override_changes.json", { overrideTokenSet: !!overrideToken, overrideChatIdSet: !!overrideChatId });
    res.json({ ok: true, warning: "To persist override tokens, update Render environment variables." });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Helper to return recent logs for admin UI
app.get("/api/logs/:name", (req, res) => {
  const name = req.params.name;
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return res.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(file));
    res.json(data);
  } catch (e) {
    res.json([]);
  }
});

// Fallback static serve
app.use((req, res) => {
  // try to serve file; else 404
  const p = path.join(__dirname, req.path);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return res.sendFile(p);
  res.status(404).send("Not found");
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 OmniLink Server live on port ${PORT}`);
});
