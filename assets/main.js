// assets/main.js
// New main page UI behaviour: category sidebar, dropdowns, services list, top contractors, testimonials
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadServices();
  await loadContractors();
  await loadReviews();
  renderSidebarCategories();
  renderServices();
  renderTopContractors();
  renderTestimonials();
  wireUI();
  window.addEventListener('resize', () => {
    // keep canvas sized if chat uses it
    resizeCanvas();
  });
  resizeCanvas();
});

/* ---------------- API LOADERS ---------------- */
async function loadServices(){
  try {
    const res = await fetch('/api/services');
    if(!res.ok) throw new Error('services load failed');
    const j = await res.json();
    SERVICES = j.services || j || [];
  } catch(e){
    console.warn('services load failed', e);
    SERVICES = [];
  }
}

async function loadContractors(){
  try {
    const res = await fetch('/api/contractors');
    if(!res.ok) throw new Error('contractors load failed');
    const j = await res.json();
    CONTRACTORS = j.contractors || j || [];
  } catch(e){
    console.warn('contractors load failed', e);
    CONTRACTORS = [];
  }
}

async function loadReviews(){
  try {
    const res = await fetch('/api/reviews');
    if(!res.ok) throw new Error('reviews load failed');
    const j = await res.json();
    REVIEWS = j.reviews || j || [];
  } catch(e){
    console.warn('reviews load failed', e);
    REVIEWS = [];
  }
}

/* ---------------- RENDERERS ---------------- */
function renderSidebarCategories(){
  const root = $('#categoriesList');
  if(!root) return;
  root.innerHTML = '';

  // collect categories and counts
  const map = {};
  SERVICES.forEach(s => {
    const cat = (s.category || 'Other').trim();
    map[cat] = map[cat] || [];
    map[cat].push(s);
  });

  // sort categories (popular first)
  const categories = Object.keys(map).sort((a,b) => map[b].length - map[a].length);
  categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'cat-item';
    item.innerHTML = `<div>${cat}</div><div class="count">${map[cat].length}</div>`;
    root.appendChild(item);

    const dropdown = document.createElement('div');
    dropdown.className = 'services-dropdown';
    map[cat].forEach(s => {
      const row = document.createElement('div');
      row.className = 'svc';
      row.textContent = s.name;
      row.addEventListener('click', ()=> {
        // when click a service in the dropdown, set search and open chat
        const input = $('#searchInput');
        if(input) input.value = s.name;
        onServiceSelected(s);
      });
      dropdown.appendChild(row);
    });
    root.appendChild(dropdown);

    // toggle showing
    item.addEventListener('click', ()=> {
      const shown = dropdown.style.display === 'block';
      // hide all others
      $$('.services-dropdown').forEach(d => d.style.display = 'none');
      dropdown.style.display = shown ? 'none' : 'block';
    });
  });
}

function renderServices(){
  const container = $('#servicesGrid');
  if(!container) return;
  container.innerHTML = '';
  // show first 200 services (or all if fewer)
  const slice = (SERVICES || []).slice(0, 200);
  slice.forEach(s => {
    const node = document.createElement('div');
    node.className = 'service-pill';
    node.innerHTML = `<h4>${s.name}</h4><p class="muted">${s.category || ''}</p>`;
    node.addEventListener('click', ()=> onServiceSelected(s));
    container.appendChild(node);
  });
}

function renderTopContractors(){
  const el = $('#topList');
  if(!el) return;
  el.innerHTML = '';
  const tops = (CONTRACTORS || []).slice(0, 8);
  tops.forEach(c => {
    const row = document.createElement('div');
    row.className = 'contractor-row';
    const img = document.createElement('img');
    img.src = c.logo_url || c.logo || '/assets/logo.png';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<strong>${c.company || c.name || 'Contractor'}</strong><div class="muted">${c.main_service || c.service || ''}</div>`;
    row.appendChild(img); row.appendChild(meta);
    row.addEventListener('click', ()=> {
      // open contractor profile page (if exists)
      if(c.id) window.open(`/c/${c.id}`, '_blank');
    });
    el.appendChild(row);
  });
}

function renderTestimonials(){
  const root = $('#testimonials');
  if(!root) return;
  root.innerHTML = '';
  (REVIEWS || []).slice(0,6).forEach(r => {
    const n = document.createElement('div');
    n.className = 'testimonial';
    n.innerHTML = `<div class="quote">“${(r.comment || r.review || r.text || '').slice(0,180)}”</div><div class="who muted">${r.reviewer_name || r.name || 'Customer'}</div>`;
    root.appendChild(n);
  });
}

/* ---------------- INTERACTIONS ---------------- */
function wireUI(){
  const searchBtn = $('#searchBtn');
  if(searchBtn) searchBtn.addEventListener('click', ()=> {
    const q = $('#searchInput').value.trim().toLowerCase();
    if(!q) return;
    // attempt to find service by name
    const found = (SERVICES||[]).find(s => (s.name||'').toLowerCase().includes(q));
    if(found) onServiceSelected(found);
  });

  const chatOpen = $('#chatOpen');
  if(chatOpen) chatOpen.addEventListener('click', () => {
    openChat();
  });
  const chatClose = $('#chatClose');
  if(chatClose) chatClose.addEventListener('click', () => closeChat());

  // lead form submit (chat form)
  const leadForm = document.getElementById('leadForm');
  if(leadForm) leadForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await submitLeadFromChat();
  });

  // top contractors quick button
  const topBtn = $('#topContractorsBtn');
  if(topBtn) topBtn.addEventListener('click', () => {
    window.scrollTo({top:0,behavior:'smooth'});
  });

  // open signup placeholder
  const openSignup = $('#openSignup');
  if(openSignup) openSignup.addEventListener('click', ()=> {
    window.location.href = '/contractor-signup.html';
  });
}

/* ---------------- SERVICE SELECT ---------------- */
function onServiceSelected(s){
  // fill chat form and open chat
  const inp = $('#leadService'); if(inp) inp.value = s.name || '';
  openChat();
  addBotMessage(`You selected <strong>${s.name}</strong>. Tell me a little about the job and we'll find a contractor.`);
  // show quick contractor options matching this service (basic)
  showContractorOptionsForService(s);
  // dispatch global event (used by other code)
  window.dispatchEvent(new CustomEvent('omni-service-selected', { detail: s }));
}

/* small contractor chooser area inside chat - reuse function from your chatbot.js if present */
function showContractorOptionsForService(s){
  // find some contractors matching main word
  const firstWord = (s.name||'').split(' ')[0].toLowerCase();
  const matches = (CONTRACTORS||[]).filter(c => (c.main_service||c.service||'').toLowerCase().includes(firstWord)).slice(0,3);
  if(matches.length){
    addBotMessage('Here are contractors that might fit your job:');
    matches.forEach(c => {
      addBotMessage(`<strong>${c.company || c.name}</strong> — ${c.main_service || c.service || ''}`);
    });
  } else {
    addBotMessage('No specific contractor suggestion — we will find the best fit.');
  }
}

/* ---------------- CHAT HELPERS ---------------- */
function openChat(){ document.getElementById('chatModal').classList.remove('hidden'); }
function closeChat(){ document.getElementById('chatModal').classList.add('hidden'); }
function addBotMessage(html){ const box = document.createElement('div'); box.className='msg bot'; box.innerHTML = html; const flow = $('#chatFlow'); flow.appendChild(box); flow.scrollTop = flow.scrollHeight; }
function addUserMessage(txt){ const box = document.createElement('div'); box.className='msg user'; box.textContent = txt; const flow = $('#chatFlow'); flow.appendChild(box); flow.scrollTop = flow.scrollHeight; }

async function submitLeadFromChat(){
  const name = $('#leadName').value.trim();
  const phone = $('#leadPhone').value.trim();
  const email = $('#leadEmail').value.trim();
  const service = $('#leadService').value.trim();
  const message = $('#leadMessage').value.trim();
  if(!name || !phone || !service){ addBotMessage('Please include name, phone and service.'); return; }

  addUserMessage(`${name} — ${phone}`);
  addBotMessage('Sending your request...');

  const payload = { name, phone, email, service, message, source: 'chat' };

  try {
    const res = await fetch('/api/lead', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const j = await res.json();
    if(j.ok){
      addBotMessage('✅ Request sent — a contractor will contact you soon.');
      // clear
      $('#leadForm').reset();
      // confetti
      playGraffiti();
      setTimeout(()=> closeChat(),1400);
    } else {
      addBotMessage('❌ Failed to send lead — please try again.');
    }
  } catch(err){
    console.error(err); addBotMessage('Network error sending lead.');
  }
}

/* ---------------- GRAFFITI/CONFETTI ---------------- */
const graffitiCanvas = document.getElementById('graffitiCanvas');
function resizeCanvas(){ if(!graffitiCanvas) return; graffitiCanvas.width = window.innerWidth; graffitiCanvas.height = window.innerHeight; }
function playGraffiti(){ const c = graffitiCanvas; if(!c) return; const ctx = c.getContext('2d'); const particles = []; const count = 80;
  for(let i=0;i<count;i++) particles.push({x:Math.random()*c.width,y:-20-Math.random()*200,vx:(Math.random()-0.5)*4,vy:2+Math.random()*4,r:2+Math.random()*6,life:80+Math.random()*60,color:['#7b5cff','#ff5fa3','#00e6c3','#ffd27a'][Math.floor(Math.random()*4)]});
  let t=0; function loop(){ t++; ctx.clearRect(0,0,c.width,c.height); particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.03; p.life--; ctx.beginPath(); ctx.fillStyle=p.color; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }); if(t<160) requestAnimationFrame(loop); else ctx.clearRect(0,0,c.width,c.height); } loop();
}
