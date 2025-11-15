// main.js — loads services, contractors, reviews and wires UI buttons
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadServices();
  await loadContractors();
  await loadReviews();
  wireButtons();
  populateServiceSelect();
});

async function loadServices() {
  try {
    const res = await fetch('/api/services');
    const j = await res.json();
    SERVICES = j.services || j;
    renderCategories();
    renderServices();
  } catch (e) {
    console.warn('services load failed', e);
    $('#servicesGrid').textContent = 'Services unavailable';
  }
}

async function loadContractors() {
  try {
    const res = await fetch('/api/contractors');
    const j = await res.json();
    CONTRACTORS = j.contractors || j;
    renderTopContractors();
  } catch (e) {
    console.warn('contractors load failed', e);
  }
}

async function loadReviews(){
  try {
    const res = await fetch('/api/logs/reviews');
    const j = await res.json();
    REVIEWS = j || [];
    renderTestimonials();
  } catch(e){
    console.warn('reviews load failed', e);
  }
}

function renderCategories(){
  const catsEl = $('#categories');
  catsEl.innerHTML = '';
  const cats = Array.from(new Set(SERVICES.map(s => s.category || 'Other')));
  cats.forEach(cat => {
    const d = document.createElement('div');
    d.className = 'cat';
    d.textContent = cat;
    d.addEventListener('click', ()=> {
      document.querySelectorAll('.service-pill').forEach(p=>p.style.display='none');
      document.querySelectorAll('.service-pill').forEach(p=>{
        if (p.dataset.cat === cat) p.style.display = 'inline-block';
      });
    });
    catsEl.appendChild(d);
  });
}

function renderServices(){
  const grid = $('#servicesGrid');
  grid.innerHTML = '';
  (SERVICES||[]).slice(0,400).forEach(s=>{
    const p = document.createElement('div'); p.className='service-pill'; p.textContent=s.name; p.dataset.cat=s.category;
    p.addEventListener('click', ()=> onServiceClick(s));
    grid.appendChild(p);
  });
}

function renderTopContractors(){
  const el = $('#topList'); el.innerHTML='';
  const tops = (CONTRACTORS||[]).filter(c => c.badge==='Platinum' || c.badge==='Diamond').slice(0,6);
  const use = tops.length ? tops : (CONTRACTORS||[]).slice(0,6);
  use.forEach(c => {
    const row = document.createElement('div'); row.className='contractor-row';
    row.innerHTML = `<strong>${c.company||c.name||'Contractor'}</strong><div class="muted">${c.service||''}</div>`;
    row.addEventListener('click', ()=> window.open(`/c/${c.id}`,'_blank'));
    el.appendChild(row);
  });
}

function renderTestimonials(){
  const el = $('#testimonials'); el.innerHTML='';
  (REVIEWS||[]).slice(0,8).forEach(r=>{
    const node = document.createElement('div'); node.style.padding='8px'; node.style.borderBottom='1px solid #ffffff06';
    node.innerHTML = `<strong>${r.reviewer_name||''}</strong><div class="muted">${r.rating||0} ★</div><div>${r.comment||''}</div>`;
    el.appendChild(node);
  });
}

function onServiceClick(s){
  // open chatbot and prefill
  const chatOpenBtn = $('#chatOpen');
  chatOpenBtn.click();
  setTimeout(()=>{
    const leadService = document.getElementById('leadService');
    leadService.value = s.name;
    // trigger showing contractors in chatbot script via dispatch
    window.dispatchEvent(new CustomEvent('omni-service-selected', { detail: s }));
  }, 220);
}

function wireButtons(){
  $('#btnContractor').addEventListener('click', ()=> location.href = '/contractor-dashboard.html');
  $('#btnAdmin').addEventListener('click', ()=> location.href = '/admin-dashboard.html');
  $('#btnReviews').addEventListener('click', ()=> location.href = '/admin-dashboard.html#reviews');
  $('#topContractorsBtn').addEventListener('click', ()=> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('reqSubmit').addEventListener('click', async ()=>{
    const payload = {
      name: $('#reqName').value,
      phone: $('#reqPhone').value,
      email: $('#reqEmail').value,
      service: $('#reqService').value,
      message: $('#reqMessage').value
    };
    if (!payload.name || !payload.phone || !payload.service) return alert('Please provide name, phone and service.');
    const res = await fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) alert('Request sent. Thank you.'); else alert('Failed to send.');
  });
}

function populateServiceSelect(){
  const sel = document.getElementById('reqService');
  sel.innerHTML = '<option value="">Select a service</option>';
  (SERVICES||[]).slice(0,400).forEach(s=>{
    const o = document.createElement('option'); o.value = s.name; o.textContent = `${s.name} — ${s.category}`;
    sel.appendChild(o);
  });
}
