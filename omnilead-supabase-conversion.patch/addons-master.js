import { createLead, upsertContractor } from "./Firebase-bridge.js";

const L = {
  get: (k,d)=>{ try { return JSON.parse(localStorage.getItem(k)||JSON.stringify(d)); } catch { return d; } },
  set: (k,v)=> localStorage.setItem(k, JSON.stringify(v))
};

export async function cacheAndSendLead(lead){
  if (!lead?.id) lead.id = "j_" + Date.now();
  const jobs = L.get("omni_jobs", []);
  jobs.push(lead);
  L.set("omni_jobs", jobs);
  await createLead(lead);
}

export async function cachePartner(p){
  await upsertContractor(p.phone||p.id, p);
  const list = L.get("omni_partners",[]);
  list.push(p); L.set("omni_partners", list);
}
