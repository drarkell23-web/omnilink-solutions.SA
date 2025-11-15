const $ = s => document.querySelector(s);
let contractorId = localStorage.getItem('ct_id') || null;

async function saveProfile(){
  const payload = { id: contractorId || `ct-${Date.now()}`, company: $('#cCompany').value, service: $('#cService').value, phone: $('#cPhone').value };
  const res = await fetch('/api/contractor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const j = await res.json();
  if (j.ok) { alert('Saved'); localStorage.setItem('ct_id', payload.id); contractorId = payload.id; $('#contractorId').textContent = contractorId; }
  else alert('Fail');
}

$('#btnSaveProfile').addEventListener('click', saveProfile);

$('#btnSaveTelegram').addEventListener('click', async ()=>{
  const token = $('#tToken').value.trim();
  const chatId = $('#tChat').value.trim();
  if (!contractorId) return alert('save profile first');
  const res = await fetch('/api/contractor', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id: contractorId, telegramToken: token, telegramChatId: chatId })});
  const j = await res.json(); if (j.ok) alert('Saved. Testing send to admin...'); else alert('Fail');
  const mres = await fetch('/api/message', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ contractorId, message: `Contractor ${contractorId} saved Telegram (test)` })});
  const mj = await mres.json(); if (mj.ok) $('#tgStatus').textContent = 'Status: saved/tested'; else $('#tgStatus').textContent = 'Status: test failed';
});

$('#btnSendMessage').addEventListener('click', async ()=>{
  const text = $('#msgText').value.trim();
  if (!contractorId) return alert('save profile first');
  const res = await fetch('/api/message',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ contractorId, message: text })});
  const j = await res.json(); if (j.ok) alert('Message sent'); else alert('Fail');
});

$('#reviewForm').addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  if (!contractorId) return alert('save profile first');
  const fd = new FormData();
  fd.append('contractor', contractorId);
  fd.append('name', $('#revName').value);
  fd.append('rating', $('#revRating').value);
  fd.append('comment', $('#revComment').value);
  const files = $('#revFiles').files;
  for (let i=0;i<files.length;i++) fd.append('images', files[i]);
  const res = await fetch('/api/review',{ method:'POST', body:fd });
  const j = await res.json(); if (j.ok) alert('Review uploaded'); else alert('Fail');
});

if (contractorId) $('#contractorId').textContent = contractorId;
