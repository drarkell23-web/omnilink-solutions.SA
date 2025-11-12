// Firebase-bridge.js — Free plan version with direct Telegram notifications
// Sends messages straight to Telegram for both admin and contractors
// Still saves everything in Firestore for record-keeping

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// -------------------------
//  FIREBASE CONFIG
// -------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCMVyCYTOJ9IOyVBFPZZddNk8xdly_jhfc",
  authDomain: "omnisolutions-717e0.firebaseapp.com",
  projectId: "omnisolutions-717e0",
  storageBucket: "omnisolutions-717e0.firebasestorage.app",
  messagingSenderId: "70821223257",
  appId: "1:70821223257:web:956672b76465350adb4a48",
  measurementId: "G-FRPM1E9H7N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// -------------------------
//  TELEGRAM CONFIG
// -------------------------
const ADMIN_TELEGRAM_BOT_TOKEN = "8526401033:AAFrG8IH8xqQL_RTD7s7JLyxZpc8e8GOyyg";
const ADMIN_TELEGRAM_CHAT_ID = "8187670531"; // your chat id from @userinfobot

// -------------------------
//  SEND MESSAGE TO TELEGRAM
// -------------------------
async function sendTelegram(token, chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
    });
  } catch (err) {
    console.warn("Telegram send failed", err);
  }
}

// --------------------------------------------------------------
//  CREATE LEAD  (client or chatbot submission)
// --------------------------------------------------------------
export async function createLead(lead) {
  try {
    const payload = { ...lead, created: serverTimestamp(), source: lead.source || "web" };
    const ref = await addDoc(collection(db, "leads"), payload);

    // Build message
    const message = buildTelegramMessage(payload);

    // Send to admin
    await sendTelegram(ADMIN_TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_CHAT_ID, message);

    // Send to contractor if ID is present
    if (lead.contractorChatId && lead.contractorToken) {
      await sendTelegram(lead.contractorToken, lead.contractorChatId, message);
    }

    return { id: ref.id, ok: true };
  } catch (err) {
    console.error("createLead error", err);
    return { ok: false, error: err.message };
  }
}

// --------------------------------------------------------------
//  CONTRACTOR SIGNUP  (saves record + alerts admin)
// --------------------------------------------------------------
export async function upsertContractor(id, contractor) {
  try {
    const payload = { ...contractor, created: serverTimestamp() };
    const ref = await addDoc(collection(db, "contractors"), payload);

    const message = `🧑‍🔧 <b>New Contractor Signup</b>\n` +
      `Company: ${contractor.company || contractor.name || "-"}\n` +
      `Service: ${contractor.service || "-"}\n` +
      `Phone: ${contractor.phone || "-"}\n` +
      `Chat ID: ${contractor.telegramChatId || "N/A"}`;

    // Notify you (admin)
    await sendTelegram(ADMIN_TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_CHAT_ID, message);

    // Confirm to contractor (welcome message)
    if (contractor.telegramToken && contractor.telegramChatId) {
      const welcome = `👋 Welcome ${contractor.company || contractor.name || "Contractor"}!\n` +
        `You are now listed under ${contractor.service || "General Services"}.\n` +
        `You’ll start receiving leads here on Telegram.`;
      await sendTelegram(contractor.telegramToken, contractor.telegramChatId, welcome);
    }

    return { ok: true, id: ref.id };
  } catch (err) {
    console.error("upsertContractor error", err);
    return { ok: false, error: err.message };
  }
}

// --------------------------------------------------------------
//  CREATE REVIEW (saves + alert admin)
// --------------------------------------------------------------
export async function createReview(review) {
  try {
    const payload = { ...review, created: serverTimestamp(), status: "pending" };
    const ref = await addDoc(collection(db, "contractor_reviews"), payload);

    // Notify admin
    const message = `⭐ <b>New Review Submitted</b>\n` +
      `Contractor: ${review.contractor || "-"}\n` +
      `Stars: ${review.stars || "-"}/5\n` +
      `Comment: ${review.comment || "-"}\n` +
      `Reviewer: ${review.name || "-"} (${review.service || "-"})`;
    await sendTelegram(ADMIN_TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_CHAT_ID, message);

    return { ok: true, id: ref.id };
  } catch (err) {
    console.error("createReview error", err);
    return { ok: false, error: err.message };
  }
}

// --------------------------------------------------------------
//  LIVE LEAD SNAPSHOT
// --------------------------------------------------------------
export function onLeadsSnapshot(callback) {
  try {
    const q = query(collection(db, "leads"), orderBy("created", "desc"));
    return onSnapshot(q, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      callback({ count: snap.size, docs });
    });
  } catch (err) {
    console.warn("onLeadsSnapshot", err);
    callback({ count: 0, docs: [] });
  }
}

// --------------------------------------------------------------
//  HELPER — Build Telegram Message
// --------------------------------------------------------------
function buildTelegramMessage(p) {
  const lines = [];
  lines.push(`<b>📥 New Lead Received</b>`);
  if (p.name) lines.push(`Name: ${p.name}`);
  if (p.phone) lines.push(`Phone: ${p.phone}`);
  if (p.email) lines.push(`Email: ${p.email}`);
  if (p.service) lines.push(`Service: ${p.service}`);
  if (p.message) lines.push(`Message: ${p.message}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  lines.push(`Source: ${p.source || "web"}`);
  return lines.join("\n");
}
