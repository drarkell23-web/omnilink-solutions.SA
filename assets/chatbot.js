// assets/chatbot.js — Chat UI, contractor pick, lead submit
const $ = sel => document.querySelector(sel);
const chatModal = $('#chatModal');
const chatOpenBtn = $('#chatOpen');
const chatCloseBtn = $('#chatClose');
const chatFlow = $('#chatFlow');
const leadForm = $('#leadForm');
const contractorOptions = $('#contractorOptions');
const contractorPickBox = $('#contractorPick');
const chatSendBtn = $('#chatSend');

let CONTRACTORS = [];
let SERVICES = [];

document.addEventListener('DOMContentLoaded', async () => {
  // try to use loaded data from main.js (if available)
  CONTRACTORS = window.__SP_CONTRACTORS || await fetchContractors();
  SERVICES = window.__SP_SERVICES || await fetchServices();
  wireForm();
});

async function fetchContractors(){
  try {
    const res = await fetch('/api/contractors');
    const j = await res.json();
    return j.contractors || [];
  } catch(e){ return []; }
}
async function fetchServices(){
  try {
    const res = await fetch('/api/services');
    const j = await res.json();
    return j.services || [];
  } catch(e){ return []; }
}

function openChatModal(){
  chatModal.classList.remove('hidden');
  addBotMessage("Hi — I'm Service Assistant. Tell me what you need or pick a service from the left.");
  scrollChat();
  // if a service is already in the field, show matching contractors
  const svc = $('#leadService').value;
  if (svc) showContractorOptionsForService({name: svc});
}

function closeChatModal(){
  chatModal.classList.add('hidden');
}

// small helpers
function addBotMessage(html){
  const d = document.createElement('div'); d.className='msg bot'; d.innerHTML = html; chatFlow.appendChild(d); scrollChat();
}
function addUserMessage(text){
  const d = document.createElement('div'); d.className='msg user'; d.textContent = text; chatFlow.appendChild(d); scrollChat();
}
function scrollChat(){ chatFlow.scrollTop = chatFlow.scrollHeight; }

// show contractors matching service
function showContractorOptionsForService(s){
  contractorOptions.innerHTML = '';
  contractorPickBox.style.display = 'block';
  const matches = (CONTRACTORS||[]).filter(c=>{
    const cs = (c.service||'').toLowerCase();
    const sname = (s.name||'').toLowerCase();
    return cs.includes(sname.split(' ')[0]) || (c.company||'').toLowerCase().includes(sname);
  }).slice(0,6);

  const top = matches.length ? matches : (CONTRACTORS||[]).slice(0,6);

  top.forEach(c=>{
    const card = document.createElement('div');
    card.className = 'contractor-card';
    card.innerHTML = `<img src="${c.logo_url||'assets/logo.png'}" alt=""><div style="font-size:13px;margin-top:6px">${c.company||c.name||'Contractor'}</div>`;
    card.addEventListener('click', ()=>{
      // set chosen contractor id on form
      leadForm.dataset.contractorId = c.id || c.auth_id || '';
      addBotMessage(`You chose <strong>${c.company||c.name}</strong>. I'll send the lead to them if you submit.`);
    });
    contractorOptions.appendChild(card);
  });
}

function wireForm(){
  chatOpenBtn.addEventListener('click', openChatModal);
  chatCloseBtn.addEventListener('click', closeChatModal);

  // if leadService changes (prefilled), show options
  const leadServiceInput = $('#leadService');
  leadServiceInput.addEventListener('input', (e)=>{
    if (e.target.value) showContractorOptionsForService({name: e.target.value});
  });

  chatSendBtn.addEventListener('click', submitLead);
}

async function submitLead(){
  const name = $('#leadName').value.trim();
  const phone = $('#leadPhone').value.trim();
  const email = $('#leadEmail').value.trim();
  const service = $('#leadService').value.trim();
  const message = $('#leadMessage').value.trim();
  const contractorId = leadForm.dataset.contractorId || null;

  if (!name || !phone || !service) {
    addBotMessage("Please provide your name, phone and select a service.");
    return;
  }

  addUserMessage(`${name} — ${phone}`);
  addBotMessage('Sending your request...');

  const payload = { name, phone, email, service, message, contractorId, source: 'chat' };

  try {
    const res = await fetch('/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (j.ok) {
      addBotMessage('✅ Request sent. A contractor or our team will contact you soon.');
      leadForm.reset(); contractorOptions.innerHTML=''; contractorPickBox.style.display='none';
      // small confetti-ish visual: create a quick dot
      confettiDot();
      setTimeout(()=> closeChatModal(), 1500);
    } else {
      addBotMessage('❌ Failed to send. Try again or contact renurture.solutions@gmail.com');
      console.error(j);
    }
  } catch (err) {
    console.error(err);
    addBotMessage('Network error sending lead.');
  }
}

function confettiDot(){
  const el = document.createElement('div');
  el.style.position='fixed'; el.style.right='60px'; el.style.bottom='140px';
  el.style.width='10px'; el.style.height='10px'; el.style.borderRadius='50%';
  el.style.background='linear-gradient(90deg,#00e6c3,#00aaff)'; el.style.zIndex=9999;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(),1200);
}

// expose helper to main.js for when user clicks a service
window.addBotMessage = addBotMessage;
window.showContractorOptionsForService = showContractorOptionsForService;
