// assets/chatbot.js — conversation flow, contractor pick, lead submit, graffiti
const $ = sel => document.querySelector(sel);

let SERVICES = [];
let CONTRACTORS = [];
let selectedService = null;
let selectedContractor = null;

const chatOpen = document.getElementById('chatOpen');
const chatModal = document.getElementById('chatModal');
const chatClose = document.getElementById('chatClose');
const chatFlow = document.getElementById('chatFlow');
const chatSend = document.getElementById('chatSend');
const graffitiCanvas = document.createElement('canvas');

document.addEventListener('DOMContentLoaded', async () => {
  await loadServices();
  await loadContractors();
  initUI();
  // attach canvas
  graffitiCanvas.id = 'graffitiCanvas';
  graffitiCanvas.style.position = 'fixed';
  graffitiCanvas.style.left = '0';
  graffitiCanvas.style.top = '0';
  graffitiCanvas.style.pointerEvents = 'none';
  graffitiCanvas.style.zIndex = '999';
  document.body.appendChild(graffitiCanvas);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('omni-service-selected', (e)=> {
    selectedService = e.detail;
    const leadServiceInput = document.getElementById('leadService');
    if (leadServiceInput) leadServiceInput.value = selectedService.name;
    openChat();
    addBotMessage(`You selected <strong>${selectedService.name}</strong>. Tell me a little about the job or choose a contractor.`);
    showContractorOptionsForService(selectedService);
  });
});

async function loadServices(){
  try { const res = await fetch('/api/services'); const j = await res.json(); SERVICES = j.services || j || []; } catch(e){ console.warn(e); }
}
async function loadContractors(){
  try { const res = await fetch('/api/contractors'); const j = await res.json(); CONTRACTORS = j.contractors || j || []; } catch(e){ console.warn(e); }
}

function initUI(){
  if(chatOpen) chatOpen.addEventListener('click', ()=> chatModal.classList.toggle('hidden'));
  if(chatClose) chatClose.addEventListener('click', ()=> chatModal.classList.add('hidden'));
  if(chatSend) chatSend.addEventListener('click', async ()=> { await submitLead(); });
  // deep link handling
  const qp = new URLSearchParams(location.search);
  if (qp.get('openChat')) {
    const svc = qp.get('service'); const contractor = qp.get('contractor');
    if (svc) {
      selectedService = { name: svc, category: '' };
      document.getElementById('leadService').value = svc;
      openChat();
      addBotMessage(`You selected <strong>${svc}</strong>.`);
      if (contractor) {
        selectedContractor = { id: contractor };
        addBotMessage('Prefilled contractor selected — will attempt to send lead to them.');
      }
    }
  }
}

function openChat(){ chatModal.classList.remove('hidden'); addBotMessage('Hi — I can help you pick a service or send a lead.'); }
function addBotMessage(text){ if(!chatFlow) return; const d=document.createElement('div'); d.className='msg bot'; d.innerHTML=text; chatFlow.appendChild(d); chatFlow.scrollTop=chatFlow.scrollHeight; }
function addUserMessage(text){ if(!chatFlow) return; const d=document.createElement('div'); d.className='msg user'; d.innerHTML=text; chatFlow.appendChild(d); chatFlow.scrollTop=chatFlow.scrollHeight; }

function showContractorOptionsForService(s){
  const holder = document.getElementById('contractorOptions');
  if (!holder) return;
  holder.innerHTML = '';
  document.getElementById('contractorPick').style.display = 'block';
  const key = (s.name||'').split(' ')[0].toLowerCase();
  const matches = (CONTRACTORS||[]).filter(c => (c.service||'').toLowerCase().includes(key));
  const top = matches.length ? matches.slice(0,3) : (CONTRACTORS||[]).slice(0,3);
  top.forEach(c=>{
    const card = document.createElement('div'); card.className='contractor-card';
    const img = document.createElement('img'); img.src = c.logo_url || c.logo || 'assets/logo.png';
    const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML = `<div><strong>${c.company||c.name||'Contractor'}</strong></div><div class="muted">${c.service||''}</div>`;
    const btn = document.createElement('button'); btn.className='pick-btn'; btn.textContent='Select';
    btn.addEventListener('click', ()=> {
      selectedContractor = c;
      addBotMessage(`You chose <strong>${c.company||c.name}</strong>.`);
      const leadForm = document.getElementById('leadForm') || document.createElement('div');
      if (leadForm) leadForm.dataset = leadForm.dataset || {};
      document.querySelector('#leadMessage')?.focus();
      // store id to a hidden property on the modal
      document.getElementById('chatModal').dataset.contractorId = c.id || c.auth_id || '';
    });
    card.appendChild(img); card.appendChild(meta); card.appendChild(btn);
    holder.appendChild(card);
  });
}

async function submitLead(){
  const name = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  const email = document.getElementById('leadEmail').value.trim();
  const message = document.getElementById('leadMessage').value.trim();
  const service = document.getElementById('leadService').value.trim();
  if (!name || !phone || !service) { addBotMessage('Please enter your name, phone and chosen service.'); return; }
  addUserMessage(`${name} — ${phone}`);
  addBotMessage('Sending your request...');
  const payload = {
    name, phone, email, message, service,
    contractor_id: (document.getElementById('chatModal').dataset.contractorId || null),
    source: 'chat'
  };
  try {
    const res = await fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) {
      addBotMessage('✅ Request sent. You will be contacted shortly.');
      document.getElementById('leadName').value='';
      document.getElementById('leadPhone').value='';
      document.getElementById('leadEmail').value='';
      document.getElementById('leadMessage').value='';
      document.getElementById('contractorPick').style.display='none';
      playGraffiti();
      setTimeout(()=> chatModal.classList.add('hidden'), 1500);
    } else {
      addBotMessage('❌ Failed to send. Try again.');
    }
  } catch(err){
    console.error(err); addBotMessage('Network error sending lead.');
  }
}

/* graffiti canvas animation */
function resizeCanvas(){ graffitiCanvas.width = window.innerWidth; graffitiCanvas.height = window.innerHeight; }
function playGraffiti(){ const ctx = graffitiCanvas.getContext('2d'); const particles=[]; const count=80;
  for(let i=0;i<count;i++){ particles.push({ x: Math.random()*graffitiCanvas.width, y:-30-Math.random()*120, vx:(Math.random()-0.5)*3, vy:2+Math.random()*4, r:2+Math.random()*4, life:80+Math.random()*40, color:['#6b5cff','#ee6ee9','#00e6c3','#ffd27a','#ff6b6b','#2ec1ff'][Math.floor(Math.random()*6)] }); }
  let t=0; function loop(){ t++; ctx.clearRect(0,0,graffitiCanvas.width,graffitiCanvas.height); particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.03; p.life--; ctx.beginPath(); ctx.fillStyle=p.color; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }); if(t<140) requestAnimationFrame(loop); else ctx.clearRect(0,0,graffitiCanvas.width,graffitiCanvas.height); } loop();
}
