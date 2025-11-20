// assets/main.js — main page logic (loads services, contractors, reviews and wires UI)
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  await loadServices();
  await loadContractors();
  await loadReviews();
  renderCategories();
  renderServices();
  renderTopContractors();
  renderTestimonials();
  wireUI();
});

async function loadServices(){
  try {
    const res = await fetch('/api/services');
    const j = await res.json();
    SERVICES = j.services || j || [];
  } catch(e){ console.warn('services load failed', e); SERVICES = []; }
}
async function loadContractors(){
  try {
    const res = await fetch('/api/contractors');
    const j = await res.json();
    CONTRACTORS = j.contractors || j || [];
  } catch(e){ console.warn('contractors load failed', e); CONTRACTORS = []; }
}
async function loadReviews(){
  try {
    const res = await fetch('/api/reviews');
    const j = await res.json();
    REVIEWS = j.reviews || j || [];
  } catch(e){ console.warn('reviews load failed', e); REVIEWS = []; }
}

function renderCategories(){
  const cats = [...new Set((SERVICES||[]).map(s => s.category || 'Other'))];
  const wrap = document.getElementById('categories');
  wrap.innerHTML = '';
  cats.forEach(cat => {
    const d = document.createElement('div');
    d.className = 'cat-pill';
    d.textContent = cat;
    d.addEventListener('click', () => {
      document.getElementById('pageTitle').textContent = cat;
      renderServices(cat);
    });
    wrap.appendChild(d);
  });
}

function renderServices(filterCategory){
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';
  const list = (SERVICES||[]).filter(s => !filterCategory || (s.category||'') === filterCategory);
  list.forEach(s => {
    const el = document.createElement('div');
    el.className = 'service-pill';
    el.textContent = s.name;
    el.title = s.description || '';
    el.addEventListener('click', () => {
      // open chat prefilled
      const leadService = document.getElementById('leadService');
      if (leadService) leadService.value = s.name;
      document.getElementById('chatOpen').click();
      setTimeout(()=> {
        addBotMessage(`You selected <strong>${s.name}</strong>. You can pick a contractor below or send your request.`);
      }, 150);
    });
    grid.appendChild(el);
  });
}

function renderTopContractors(){
  const el = document.getElementById('topList');
  el.innerHTML = '';
  const tops = (CONTRACTORS||[]).slice(0,8);
  tops.forEach(c => {
    const row = document.createElement('div');
    row.className = 'contractor-row';
    row.innerHTML = `<img src="${c.logo_url||'assets/logo.png'}" /><div><strong>${c.company||c.name}</strong><div class="muted">${c.service||''}</div></div>`;
    row.addEventListener('click', ()=> window.open(`/c/${c.id || c.auth_id || ''}`,'_blank'));
    el.appendChild(row);
  });
}

function renderTestimonials(){
  const el = document.getElementById('testimonials');
  el.innerHTML = '';
  (REVIEWS||[]).slice(0,6).forEach(r=>{
    const node = document.createElement('div');
    node.className = 'testimonial';
    node.innerHTML = `<strong>${r.reviewer_name || r.name || 'Customer'}</strong>
      <div class="muted">${r.rating || 5} ★ — ${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
      <div>${r.comment || r.review || ''}</div>`;
    el.appendChild(node);
  });
}

function wireUI(){
  document.getElementById('chatOpen').addEventListener('click', openChatModal);
  document.getElementById('chatClose').addEventListener('click', closeChatModal);
  document.getElementById('clearBtn').addEventListener('click', ()=> {
    document.getElementById('leadForm').reset();
    document.getElementById('contractorPick').style.display = 'none';
    document.getElementById('contractorOptions').innerHTML = '';
  });

  // allow search
  const si = document.getElementById('searchInput');
  si.addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if (!q) { renderServices(); return; }
    const filtered = (SERVICES||[]).filter(s => (s.name||'').toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q));
    const grid = document.getElementById('servicesGrid'); grid.innerHTML = '';
    filtered.forEach(s=>{
      const el = document.createElement('div'); el.className='service-pill'; el.textContent=s.name;
      el.addEventListener('click', ()=> { document.getElementById('leadService').value = s.name; openChatModal(); });
      grid.appendChild(el);
    });
  });

  // Expose helper functions used by chatbot.js
  window.__SP_CONTRACTORS = CONTRACTORS;
  window.__SP_SERVICES = SERVICES;
}
