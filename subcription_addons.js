// subscription_addons.js — OmniSolutions Plan Sync + Self-Healing
import { db } from "./Firebase-bridge.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

console.log("💸 OmniSolutions subscription_addons.js loaded.");

// ===== LocalStorage Helper =====
const L = {
  get: (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
    } catch {
      return d;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ===== Default Subscription Plans =====
const DEFAULT_PLANS = [
  {
    id: "monthly_basic",
    name: "Monthly Basic",
    price: 100,
    nextPrice: 299,
    cycle: "monthly",
    desc: "R100 first month → R299/m",
  },
  {
    id: "six_month",
    name: "6 Months",
    price: 1599,
    cycle: "6mo",
    desc: "Prepay 6 months (save R195)",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 2999,
    cycle: "yearly",
    desc: "Save vs monthly",
  },
];

// ===== Safe Initialization =====
if (!localStorage.getItem("omni_subscriptions")) {
  L.set("omni_subscriptions", DEFAULT_PLANS);
  console.log("💾 Default plans stored locally.");
}

// ===== Push Plans to Firebase =====
export async function syncPlansToFirebase() {
  try {
    const plans = L.get("omni_subscriptions", DEFAULT_PLANS);
    for (const p of plans) {
      await setDoc(doc(db, "plans", p.id), {
        ...p,
        updatedAt: serverTimestamp(),
      });
    }
    console.log("✅ Plans synced to Firebase.");
  } catch (err) {
    console.error("⚠️ Plan sync failed:", err);
  }
}

// ===== Fetch Plans from Firebase =====
export async function fetchPlansFromFirebase() {
  try {
    const snap = await getDocs(collection(db, "plans"));
    const arr = snap.docs.map((d) => d.data());
    if (arr.length) {
      L.set("omni_subscriptions", arr);
      console.log("☁️ Plans loaded from Firebase.");
      return arr;
    } else {
      console.warn("⚠️ No plans in Firebase — using defaults.");
      return DEFAULT_PLANS;
    }
  } catch (err) {
    console.error("⚠️ Plan fetch failed:", err);
    return DEFAULT_PLANS;
  }
}

// ===== Self-Healing Watchdog =====
// If Firebase was down or user offline, automatically repair when back online
async function selfHealPlans() {
  if (navigator.onLine) {
    console.log("🩺 Running plan self-healing...");
    const localPlans = L.get("omni_subscriptions", DEFAULT_PLANS);
    await syncPlansToFirebase(localPlans);
    console.log("💾 Plans verified and synced.");
  } else {
    console.log("🛰 Offline — waiting to sync plans later.");
  }
}

// ===== Boot Behavior =====
window.addEventListener("load", async () => {
  if (navigator.onLine) {
    await fetchPlansFromFirebase();
    await selfHealPlans();
  } else {
    console.log("🛰 Offline mode — using stored plans.");
  }
});

// Watch for reconnection to auto-heal
window.addEventListener("online", async () => {
  console.log("🌐 Connection restored — healing plans...");
  await selfHealPlans();
});
