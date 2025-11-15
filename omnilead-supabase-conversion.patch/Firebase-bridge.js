// Bridge used by front-end to communicate with server endpoints.
// Keeps same function names you used previously so dashboard JS continues to work.

export async function createLead(lead) {
  try {
    const r = await fetch('/api/lead', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(lead) });
    return await r.json();
  } catch (e) { return { ok:false, error: String(e) }; }
}

export async function upsertContractor(idOrData, maybeData) {
  // compatibility support: if called with (id, data) or with (data)
  let data = maybeData || idOrData;
  if (typeof idOrData === 'string' && maybeData) data.id = idOrData;
  try {
    const r = await fetch('/api/contractor', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    return await r.json();
  } catch (e) { return { ok:false, error: String(e) }; }
}

export async function uploadReview(formData) {
  try {
    const r = await fetch('/api/review', { method: 'POST', body: formData });
    return await r.json();
  } catch (e) { return { ok:false, error: String(e) }; }
}

export async function fetchServices(cat) {
  try {
    const url = cat ? `/api/services?cat=${encodeURIComponent(cat)}` : '/api/services';
    const r = await fetch(url); const j = await r.json(); return j.services || [];
  } catch (e) { return []; }
}

export async function fetchContractors() {
  try {
    const r = await fetch('/api/contractors'); const j = await r.json(); return j.contractors || [];
  } catch (e) { return []; }
}
