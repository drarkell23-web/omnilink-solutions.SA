// public/admin-create-contractor.js
(async ()=> {
  const qp = new URLSearchParams(location.search);
  const key = qp.get('key') || '';
  // show form only if key provided
  if (!key) {
    document.getElementById('locked').style.display = 'block';
    return;
  }
  document.getElementById('formWrap').style.display = 'block';

  const msg = id => { const el=document.getElementById('msg'); el.innerText = id; };

  document.getElementById('createBtn').addEventListener('click', async ()=>{
    const company = document.getElementById('company').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    const telegram = document.getElementById('telegram').value.trim();

    if (!company || !phone || !password) { msg('Please fill required fields'); return; }

    try {
      const res = await fetch('/api/admin/create-contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ company, phone, password, telegram })
      });
      const j = await res.json();
      if (j.ok) {
        msg('Contractor created: ' + (j.contractor.company || j.contractor.id));
        document.getElementById('company').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('password').value = '';
        document.getElementById('telegram').value = '';
      } else {
        msg('Error: ' + (j.error || JSON.stringify(j)));
      }
    } catch (e) {
      msg('Network error: ' + e.message);
    }
  });
})();
