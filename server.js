// ===== OmniLink Solutions — Node.js Server for Render + Telegram Integration =====

import express from "express";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Telegram bot setup
const BOT_TOKEN = process.env.BOT_TOKEN || "8526401033:AAFrG8IH8xqQL_RTD7s7JLyxZpc8e8GOyyg";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8187670531"; // replace if needed

// Helper paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve all static files (HTML, CSS, JS)

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Send message to Telegram helper
async function sendToTelegram(text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML"
      })
    });
    const data = await res.json();
    if (!data.ok) console.error("Telegram send error:", data);
    return data;
  } catch (err) {
    console.error("Telegram send failed:", err);
  }
}

// ====== API ROUTES ======

// Lead form
app.post("/api/lead", async (req, res) => {
  const { name, phone, email, service, message } = req.body;
  const msg = `
<b>📩 New Lead Received</b>
👤 Name: ${name || "-"}
📞 Phone: ${phone || "-"}
📧 Email: ${email || "-"}
🛠 Service: ${service || "-"}
💬 Message: ${message || "-"}
`;
  await sendToTelegram(msg);
  res.json({ ok: true });
});

// Contractor signup
app.post("/api/contractor", async (req, res) => {
  const { name, phone, service, company } = req.body;
  const msg = `
<b>🧰 New Contractor Signup</b>
🏢 Company: ${company || "-"}
👷 Name: ${name || "-"}
📞 Phone: ${phone || "-"}
🛠 Service: ${service || "-"}
`;
  await sendToTelegram(msg);
  res.json({ ok: true });
});

// Review submission
app.post("/api/review", async (req, res) => {
  const { contractor, rating, comment } = req.body;
  const msg = `
<b>⭐ New Review Submitted</b>
👷 Contractor: ${contractor || "-"}
⭐ Rating: ${rating || "-"} stars
💬 Comment: ${comment || "-"}
`;
  await sendToTelegram(msg);
  res.json({ ok: true });
});

// Start server
app.listen(PORT, () => console.log(`🚀 OmniLink Server live on port ${PORT}`));
