// public/contractor-dashboard.js
(async ()=> {
  // helper
  const $ = (s) => document.querySelector(s);

  // load stored contractor
  let contractor = null;
  try { contractor = JSON.parse(localStorage.getItem('contractor')); } catch(e){}

  if (!contractor || !contractor.id) {
    window.location.href = '/contractor-login.html';
    return;
  }

  // UI elements
  $('#cName').innerText = contractor.company || contractor.name || 'Contractor';
  $('#cService').innerText = contractor.service || contractor.main_service || contractor.category || '';
  $('#pCompany').innerText = contractor.company || '';
  $('#pPhone').innerText = contractor.phone || '';
  $('#pTelegram').innerText = contractor.telegram_chat_id || '—';

  // logout
  $('#logoutBtn').addEventListener('click', ()=> { localStorage.removeItem('contractor'); location.href = '/'; });

  // accent color customisation
  const accentInput = $('#accentInput');
  accentInput.addEventListener('input', (e)=> {
    document.documentElement.style.setProperty('--accent', e.target.value);
  });

  // fetch leads and messages
  async function fetchLeads(){
    try {
      const res = await fetch('/api/my/leads', { headers: { 'x-contractor-id': contractor.id }});
      const j = await res.json();
      if (!j.ok) return console.warn('leads fetch fail', j);
      const arr = j.leads || [];
      $('#totalLeads').innerText = arr.length;
      const list = $('#leadsList');
      list.innerHTML = '';
      if (!arr.length) { list.innerHTML = '<div class="muted">No leads yet.</div>'; return; }
      arr.slice(0,50).forEach(l => {
        const r = document.createElement('div'); r.className='lead-row';
        r.innerHTML = `<div><strong>${l.name}</strong><div class="muted">${l.service} • ${new Date(l.created_at).toLocaleString()}</div></div><div><a href="tel:${l.phone}" style="color:#00b0ff">${l.phone}</a></div>`;
        list.appendChild(r);
      });
    } catch (e) { console.warn(e); }
  }

  async function fetchMessages(){
    try {
      const res = await fetch('/api/my/messages', { headers: { 'x-contractor-id': contractor.id }});
      const j = await res.json();
      if (!j.ok) return console.warn('messages fetch fail', j);
      const arr = j.messages || [];
      $('#totalMsgs').innerText = arr.length;
      const panel = $('#telegramPanel');
      panel.innerHTML = '';
      if (!arr.length) panel.innerHTML = '<div class="muted">No messages yet</div>';
      arr.slice(0,200).forEach(m=>{
        const d = document.createElement('div'); d.style.padding='8px'; d.style.borderBottom='1px solid #06262c'; d.innerHTML = `<div class="muted" style="font-size:12px">${new Date(m.created_at).toLocaleString()}</div><div style="margin-top:6px">${m.message}</div>`;
        panel.appendChild(d);
      });
    } catch (e) { console.warn(e); }
  }

  // send message to admin
  $('#sendMsgBtn').addEventListener('click', async ()=>{
    const text = $('#msgInput').value.trim();
    if (!text) return;
    try {
      const res = await fetch('/api/message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractorId: contractor.id, message: text })});
      const j = await res.json();
      if (j.ok) {
        $('#msgInput').value = '';
        fetchMessages();
      } else {
        alert('Send failed: ' + (j.error || 'unknown'));
      }
    } catch (e) { alert('Network error'); }
  });

  // wire quick buttons
  $('#btnLeads').addEventListener('click', fetchLeads);
  $('#btnMessages').addEventListener('click', fetchMessages);
  $('#btnProfile').addEventListener('click', ()=> { alert('Profile panel'); });

  // initial load
  fetchLeads();
  fetchMessages();

  // poll for new messages every 20s
  setInterval(fetchMessages, 20000);
})();
