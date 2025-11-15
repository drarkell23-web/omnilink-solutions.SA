const $ = s=>document.querySelector(s);

async function loadContractors(){
  const res = await fetch('/api/contractors'); const j = await res.json();
  const list = $('#contractorsList'); list.innerHTML = '';
  (j.contractors||[]).forEach(c=>{
    const el = document.createElement('div'); el.className='contract-row';
    el.innerHTML = `<div><strong>${c.company||c.name}</strong><div class="muted">${c.service||''}</div></div>
      <div>
        <button class="badge-btn" data-id="${c.id}" onclick="applyBadge(this.dataset.id)">Set Badge</button>
        <button class="badge-btn" onclick="openContractor('${c.id}')">Open</button>
        <button class="badge-btn" onclick="deleteContractor('${c.id}')">Delete</button>
      </div>`;
    list.appendChild(el);
  });
}

async function loadLeads(){
  const res = await fetch('/api/logs/leads'); const j = await res.json();
  const list = $('#leadsList'); list.innerHTML = '';
  (j||[]).slice(0,50).forEach(l=>{
    const el = document.createElement('div'); el.style.padding='8px'; el.style.borderBottom='1px solid #ffffff06';
    el.innerHTML = `<strong>${l.name||l.customer_name||'—'}</strong> <div class="muted">${l.phone||''} • ${l.service||''}</div>`;
    list.appendChild(el);
  });
}

window.applyBadge = async (id)=>{
  const adminSecret = $('#adminSecret').value;
  const badge = $('#abBadge').value;
  if(!adminSecret){ alert('enter admin secret'); return; }
  const res = await fetch('/api/apply-badge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminSecret,contractorId:id,badge})});
  const j = await res.json(); if(j.ok) alert('badge applied'); loadContractors();
}

async function deleteContractor(id){
  if(!confirm('Delete contractor?')) return;
  alert('Demo: removal not implemented server-side. Use DB to remove.');
}

function openContractor(id){
  window.open(`/c/${id}`,'_blank');
}

$('#btnLoadContracts').addEventListener('click', ()=> loadContractors());
$('#btnApplyBadge').addEventListener('click', async ()=>{
  const adminSecret = $('#adminSecret').value;
  const contractorId = $('#abContractor').value;
  const badge = $('#abBadge').value;
  if(!adminSecret) return alert('Enter admin secret');
  const res = await fetch('/api/apply-badge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminSecret,contractorId,badge})});
  const j = await res.json(); if(j.ok){ alert('done'); loadContractors(); } else alert('fail');
});

loadContractors(); loadLeads();
