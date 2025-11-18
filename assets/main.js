// main.js — loads services + categories and renders grid
const $ = sel => document.querySelector(sel);

let SERVICES = [];
let CONTRACTORS = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadServices();
  await loadContractors();
  renderCategories();
  renderServicesGrid();
  wireSearch();
});

async function loadServices(){
  try {
    const res = await fetch('/api/services');
    const j = await res.json();
    SERVICES = j.services || [];
  } catch (e) {
    console.warn("loadServices failed", e);
    SERVICES = [];
  }
}

async function loadContractors(){
  try {
    const res = await fetch('/api/contractors');
    const j = await res.json();
    CONTRACTORS = j.contractors || [];
  } catch (e) {
    console.warn("loadContractors failed", e);
    CONTRACTORS = [];
  }
}

function renderCategories(){
  const holder = document.getElementById('categories');
  if(!holder) return;
  // collapse categories into counts
  const cats = {};
  SERVICES.forEach(s=>{
    const c = s.category || "Other";
    cats[c] = (cats[c]||0)+1;
  });
  const entries = Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  holder.innerHTML = '';
  entries.forEach(([name,count])=>{
    const btn = document.createElement('div');
    btn.className='cat-btn';
    btn.textContent = `${name} ${count? ' ('+count+')':''}`;
    btn.addEventListener('click', ()=> filterCategory(name));
    holder.appendChild(btn);
  });
}

function renderServicesGrid(filterCat){
  const g = document.getElementById('servicesGrid');
  if(!g) return;
  const list = filterCat ? SERVICES.filter(s=> (s.category||'').toLowerCase()===filterCat.toLowerCase()) : SERVICES;
  g.innerHTML = '';
  // render compact tiles (three columns)
  list.slice(0,200).forEach(s=>{
    const d = document.createElement('div'); d.className='service-item';
    d.innerHTML = `<div class="s-title">${s.name}</div><div class="s-cat">${s.category || ''}</div>`;
    d.addEventListener('click', ()=> onServiceClick(s));
    g.appendChild(d);
  });
}

function filterCategory(name){
  renderServicesGrid(name);
}

function onServiceClick(s){
  // prefill chat service and open chat
  const leadService = document.getElementById('leadService');
  if(leadService) leadService.value = s.name;
  openChatQuick();
}

function wireSearch(){
  const input = document.getElementById('searchInput');
  if(!input) return;
  input.addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if(!q) { renderServicesGrid(); return; }
    const filtered = SERVICES.filter(s=> (s.name||'').toLowerCase().includes(q) || (s.category||'').toLowerCase().includes(q));
    const g = document.getElementById('servicesGrid'); g.innerHTML='';
    filtered.slice(0,200).forEach(s=>{
      const d = document.createElement('div'); d.className='service-item';
      d.innerHTML = `<div class="s-title">${s.name}</div><div class="s-cat">${s.category || ''}</div>`;
      d.addEventListener('click', ()=> onServiceClick(s));
      g.appendChild(d);
    });
  });
}

/* Chat open helper used by main + chatbot */
window.openChatQuick = function(){
  const openBtn = document.getElementById('openChatBtn');
  if(openBtn) openBtn.click();
}
