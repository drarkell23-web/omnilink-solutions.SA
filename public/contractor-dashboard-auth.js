// public/contractor-dashboard-auth.js
// Upgraded contractor dashboard client: uses Supabase Auth + Storage.
// Replace or include this file in your contractor dashboard page <script type="module" src="/public/contractor-dashboard-auth.js"></script>

import { supabase, getCurrentUser } from '/public/supabase-client.js';

// DOM helpers
const $ = id => document.getElementById(id);

// Ensure user is logged in; if not, redirect to login
async function ensureUser() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user || null;
  if (!user) {
    window.location.href = '/auth/contractor-login.html';
    throw new Error('redirecting to login');
  }
  return user;
}

async function loadProfileAndUI() {
  const user = await ensureUser();
  // fetch extended profile from contractors table by auth user id
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .eq('auth_id', user.id)
    .limit(1)
    .maybeSingle();

  let profile = data || null;
  if (!profile) {
    // create a new contractor row linked to auth user
    const insertRes = await supabase.from('contractors').insert({
      auth_id: user.id,
      email: user.email,
      name: user.user_metadata?.company || '',
      created_at: new Date().toISOString()
    }).select().maybeSingle();
    profile = insertRes.data || null;
  }

  // populate UI fields (if present)
  if ($('fieldName')) $('fieldName').value = profile?.name || user.user_metadata?.company || '';
  if ($('fieldPhone')) $('fieldPhone').value = profile?.phone || '';
  if ($('fieldEmail')) $('fieldEmail').value = profile?.email || user.email || '';
  if ($('fieldTelegramToken')) $('fieldTelegramToken').value = profile?.telegram_token || '';
  if ($('fieldTelegramChatId')) $('fieldTelegramChatId').value = profile?.telegram_chat_id || '';

  // if logo_url present, set preview
  if (profile?.logo_url) {
    const logoPreview = $('logoPreview');
    logoPreview.style.backgroundImage = `url(${profile.logo_url})`;
    logoPreview.textContent = '';
    if ($('previewLogo')) $('previewLogo').style.backgroundImage = `url(${profile.logo_url})`;
  }

  // store profile in window for other functions
  window.omniProfile = profile;
  await renderReviews(profile);
  await loadContractorMessages(profile);
}

// Save profile and write to Supabase contractors table
async function saveProfileSupabase() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert('Not logged in');

  const payload = {
    auth_id: user.id,
    name: $('fieldName').value.trim(),
    phone: $('fieldPhone').value.trim(),
    email: $('fieldEmail').value.trim(),
    service: $('fieldService') ? $('fieldService').value : null,
    telegram_token: $('fieldTelegramToken').value.trim(),
    telegram_chat_id: $('fieldTelegramChatId').value.trim(),
    updated_at: new Date().toISOString()
  };

  // If user uploaded a logo file element exists (#logoInput)
  const logoFile = $('logoInput')?.files?.[0];
  if (logoFile) {
    try {
      const logoUrl = await uploadFileToBucket(logoFile, 'logos');
      payload.logo_url = logoUrl;
    } catch (e) {
      console.warn('logo upload failed', e);
      // Continue without logo
    }
  }

  // upsert row by auth_id
  const { data, error } = await supabase.from('contractors').upsert({
    ...payload
  }, { onConflict: ['auth_id'] }).select().maybeSingle();

  if (error) {
    console.error('save profile error', error);
    return alert('Failed to save profile: ' + error.message);
  }
  window.omniProfile = data;
  alert('Profile saved (Supabase).');
}

// Upload a file to Supabase Storage and return public URL
export async function uploadFileToBucket(file, bucket = 'logos') {
  if (!file) throw new Error('no file');
  // generate path
  const fname = `${Date.now()}-${Math.random().toString(36).slice(2,6)}-${file.name.replace(/\s+/g,'_')}`;
  const { data, error } = await supabase.storage.from(bucket).upload(fname, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  // construct public URL
  const { data: urlData, error: uerr } = supabase.storage.from(bucket).getPublicUrl(data.path);
  if (uerr) throw uerr;
  return urlData.publicUrl;
}

// Listener wiring
document.addEventListener('DOMContentLoaded', async ()=>{
  try {
    await loadProfileAndUI();
  } catch(e) {
    console.warn('redirecting to login', e);
    return;
  }

  // attach save button
  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfileSupabase);
  document.getElementById('msgSend')?.addEventListener('click', async ()=>{
    const txt = $('msgInput').value.trim();
    if (!txt) return;
    // store message row
    const profile = window.omniProfile;
    await supabase.from('messages').insert({ contractor_id: profile.id, message: txt, created_at: new Date().toISOString() });
    // also notify admin through existing server endpoint (keeps Telegram send logic server-side)
    await fetch('/api/message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractorId: profile.id, message: txt }) });
    appendChat(`You: ${txt}`);
    $('msgInput').value = '';
  });

  // review submit flow (uploads images to reviews bucket)
  document.getElementById('submitReview')?.addEventListener('click', async ()=>{
    const name = $('reviewName').value.trim() || 'Customer';
    const rating = Number($('reviewStars').value || 5);
    const comment = $('reviewComment').value.trim();
    const files = $('reviewImages')?.files || [];
    const imageUrls = [];
    for (let i=0;i<files.length;i++){
      try {
        const url = await uploadFileToBucket(files[i], 'reviews');
        imageUrls.push(url);
      } catch (e) { console.warn('img upload fail', e); }
    }
    // insert review row
    const profile = window.omniProfile;
    await supabase.from('reviews').insert({
      contractor_id: profile.id,
      reviewer_name: name,
      rating,
      comment,
      images: imageUrls,
      created_at: new Date().toISOString()
    });
    // also POST to server /api/review to keep JSON fallback and uploads behavior if needed
    const fd = new FormData();
    fd.append('contractor', profile.id);
    fd.append('name', name);
    fd.append('rating', rating);
    fd.append('comment', comment);
    // optional: send images to server as fallback - we still already uploaded to Supabase
    await fetch('/api/review', { method:'POST', body: fd });
    alert('Review submitted.');
    renderReviews(profile);
  });
});

// small helpers
function appendChat(txt){
  const box = $('chatBox');
  if (!box) return;
  const n = document.createElement('div'); n.textContent = txt; n.style.marginBottom = '6px';
  box.prepend(n);
}

// render reviews for current contractor
async function renderReviews(profile){
  if (!profile) return;
  const { data, error } = await supabase.from('reviews').select('*').eq('contractor_id', profile.id).order('created_at', { ascending: false }).limit(50);
  const listEl = $('reviewsList');
  if (!listEl) return;
  listEl.innerHTML = '';
  (data || []).forEach(r=>{
    const d = document.createElement('div'); d.className = 'review';
    d.innerHTML = `<strong>${r.reviewer_name}</strong> — ⭐ ${r.rating}<div class="muted small">${r.comment}</div>`;
    if (Array.isArray(r.images) && r.images.length){
      const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.gap='6px'; wrap.style.marginTop='6px';
      r.images.forEach(u => { const i = document.createElement('img'); i.src = u; i.style.width='72px'; i.style.height='54px'; i.style.objectFit='cover'; wrap.appendChild(i); });
      d.appendChild(wrap);
    }
    listEl.appendChild(d);
  });
}

// load contractor messages from Supabase
async function loadContractorMessages(profile){
  if (!profile) return;
  const { data } = await supabase.from('messages').select('*').eq('contractor_id', profile.id).order('created_at', { ascending: false }).limit(200);
  const box = $('chatBox');
  box.innerHTML = '';
  (data || []).forEach(m => {
    const n = document.createElement('div'); n.textContent = `${new Date(m.created_at).toLocaleString()} — ${m.message}`; n.style.marginBottom='6px';
    box.appendChild(n);
  });
}
