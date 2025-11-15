/* main.js - interacts with index.html and server endpoints */
(async function(){
  // fetch services and populate sidebar / service lists
  async function getServices(){
    try {
      const res = await fetch('/api/services');
      const json = await res.json();
      return (json.services || json);
    } catch(e){ console.error(e); return []; }
  }

  const services = await getServices();
  // group by category
  const cats = {};
  for (const s of services) {
    const cat = s.category || s.cat || s.catname || s.cat || 'Other';
    if (!cats[cat]) cats[cat]=[];
    cats[cat].push(s);
  }

  // populate sidebar categories
  const sidebar = document.getElementById('sidebar-categories');
  Object.keys(cats).forEach(cat=>{
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat;
    btn.addEventListener('click', ()=> renderCategory(cat));
    sidebar.appendChild(btn);
  });

  // fill lead-service select & popular chips (first 20)
  const leadService = document.getElementById('lead-service');
  const popular = document.getElementById('popular-services');
  const categoryServices = document.getElementById('category-services');

  services.slice(0,120).forEach(s=>{
    const opt = document.createElement('option');
    opt.value = s.name || s.service || s.name;
    opt.textContent = s.name || s.service || s.name;
    leadService.appendChild(opt);
  });

  services.slice(0,30).forEach(s=>{
    const chip = document.createElement('div');
    chip.className = 'popular-chip';
    chip.textContent = s.name;
    chip.addEventListener('click', ()=> openChatWithService(s.name));
    popular.appendChild(chip);
  });

  function renderCategory(cat){
    categoryServices.innerHTML = `<h4>${cat}</h4>`;
    const list = document.createElement('div');
    (cats[cat] || []).forEach(s=>{
      const c = document.createElement('div');
      c.className = 'popular-chip service-chip';
      c.textContent = s.name;
      c.addEventListener('click', ()=> openChatWithService(s.name));
      list.appendChild(c);
    });
    categoryServices.appendChild(list);
  }

  // default render first cat
  const firstCat = Object.keys(cats)[0];
  if (firstCat) renderCategory(firstCat);

  /* -- Chat panel behavior -- */
  const chatPanel = document.getElementById('chat-panel');
  const chatToggle = document.getElementById('chat-toggle');
  document.getElementById('chat-toggle')?.addEventListener('click', ()=> chatPanel.classList.add('open'));
  document.getElementById('chat-close')?.addEventListener('click', ()=> chatPanel.classList.remove('open'));

  function openChatWithService(svc){
    const el = document.getElementById('chat-service');
    if (el) el.value = svc;
    chatPanel.classList.add('open');
  }

  // wire lead form submission to server /api/lead
  const leadForm = document.getElementById('lead-form');
  leadForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = {
      name: document.getElementById('lead-name').value,
      phone: document.getElementById('lead-phone').value,
      email: document.getElementById('lead-email').value,
      service: document.getElementById('lead-service').value,
      message: document.getElementById('lead-message').value
    };
    const res = await fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const json = await res.json();
    if (json.ok) {
      // small animation / graffiti
      showGraffiti("✅ Lead sent");
      alert('Lead sent — admin will be notified.');
      leadForm.reset();
    } else {
      alert('Failed to send lead');
    }
  });

  // chat form send
  document.getElementById('chat-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = {
      name: document.getElementById('chat-name').value,
      phone: document.getElementById('chat-phone').value,
      email: document.getElementById('chat-email').value,
      service: document.getElementById('chat-service').value,
      message: document.getElementById('chat-message').value
    };
    const res = await fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const json = await res.json();
    if (json.ok) {
      showGraffiti("🎉 Sent");
      alert('Chat request sent. Admin & contractors will be notified.');
      document.getElementById('chat-form').reset();
      document.getElementById('chat-panel').classList.remove('open');
    } else {
      alert('Failed to send');
    }
  });

  /* Graffiti sparkle */
  function showGraffiti(text){
    const g = document.createElement('div');
    g.className = 'graffiti';
    const span = document.createElement('div');
    span.className = 'spark';
    span.textContent = text;
    g.appendChild(span);
    document.body.appendChild(g);
    setTimeout(()=> g.remove(), 2000);
  }

  // top contractors button (demo open contractor list)
  document.getElementById('top-contractors-btn')?.addEventListener('click', async ()=>{
    // for demo, load contractors and pop an alert or modal — here we fetch contractors
    const res = await fetch('/api/contractors');
    const json = await res.json();
    const names = (json.contractors||[]).slice(0,10).map(c => c.company_name || c.contact_name || c.phone).join('\n');
    alert('Top contractors:\n' + (names||'none'));
  });

  // admin button - opens admin-dashboard.html (protected by admin secret)
  document.getElementById('admin-btn')?.addEventListener('click', ()=> location.href='/admin-dashboard.html');
  document.getElementById('contractor-dashboard-btn')?.addEventListener('click', ()=> location.href='/contractor-dashboard.html');

})();
