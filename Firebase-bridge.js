// Firebase-bridge.js — client bridge (keeps your Firestore client writes, and posts to Render endpoints)
// Note: leave your Firebase config (apiKey etc) as-is if you still want Firestore writes.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// <-- put your firebase config here if you want Firestore writes to continue -->
const firebaseConfig = {
  apiKey: "<YOUR-API-KEY>",
  authDomain: "<YOUR-AUTH-DOMAIN>",
  projectId: "<YOUR-PROJECT-ID>",
  storageBucket: "<YOUR-STORAGE-BUCKET>",
  messagingSenderId: "<YOUR-MESSAGING-SENDER-ID>",
  appId: "<YOUR-APP-ID>"
};

// If you want to stop Firestore usage entirely you can remove the initializeApp below.
let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firestore init failed (expected if no config provided)", e);
}

// Save lead (client-side): writes to Firestore (if available) and posts to Render backend
export async function createLead(lead) {
  try {
    if (db) {
      await addDoc(collection(db, "leads"), { ...lead, created: serverTimestamp() });
    }
  } catch (e) {
    console.warn("Firestore write failed", e);
  }

  // Post to Render backend (Telegram forwarding)
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead)
    });
    return await res.json();
  } catch (e) {
    console.error("createLead POST failed", e);
    return { ok: false, error: e.message || String(e) };
  }
}

// Save contractor (client-side)
export async function upsertContractor(id, contractor) {
  try {
    if (db) {
      await addDoc(collection(db, "contractors"), { ...contractor, created: serverTimestamp() });
    }
  } catch (e) { console.warn("Firestore write failed", e); }

  try {
    const res = await fetch("/api/contractor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractor)
    });
    return await res.json();
  } catch (e) {
    console.error("upsertContractor POST failed", e);
    return { ok: false, error: e.message || String(e) };
  }
}

// Create review (with image upload support). `files` must be an array of File objects from input.
export async function createReview(review, files = []) {
  try {
    // attempt Firestore write
    if (db) {
      await addDoc(collection(db, "contractor_reviews"), { ...review, created: serverTimestamp(), status: "pending" });
    }
  } catch (e) { console.warn("Firestore write failed", e); }

  try {
    const form = new FormData();
    for (const key in review) form.append(key, review[key]);
    for (const f of files) form.append("images", f);
    const res = await fetch("/api/review", { method: "POST", body: form });
    return await res.json();
  } catch (e) {
    console.error("createReview POST failed", e);
    return { ok: false, error: e.message || String(e) };
  }
}
