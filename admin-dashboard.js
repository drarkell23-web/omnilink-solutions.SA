// admin-dashboard.js - load contractors and apply badge
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("admin-contractors-list");
  const leadsList = document.getElementById("admin-leads-list");

  async function loadContractors(){
    const res = await fetch("/api/contractors");
    const j = await res.json();
    const arr = j.contractors || [];
    list.innerHTML = "";
    arr.forEach(c => {
      const row = document.createElement("div");
      row.className = "admin-contractor-row";
      row.innerHTML = `
        <div><strong>${c.name || c.company || "Unnamed"}</strong><br/><small>${c.service || ""} • ${c.phone || ""}</small></div>
        <div>
          <button class="btn open" data-id="${c.id}">Open</button>
          <button class="btn badge" data-id="${c.id}">Set Badge</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  async function loadLeads(){
    const res = await fetch("/api/logs/leads");
    const arr = await res.json();
    leadsList.innerHTML = "";
    (arr||[]).slice(0,50).forEach(l=>{
      const li = document.createElement("div");
      li.className = "lead-row";
      li.innerHTML = `<strong>${l.name}</strong><div>${l.phone} • ${l.service}</div>`;
      leadsList.appendChild(li);
    });
  }

  document.getElementById("load-contractors")?.addEventListener("click", async ()=>{
    await loadContractors();
    await loadLeads();
  });

  // apply badge
  document.getElementById("apply-badge-form")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const id = document.getElementById("badge-id").value.trim();
    const badge = document.getElementById("badge-select").value;
    const adminSecret = document.getElementById("admin-secret").value.trim();
    if(!adminSecret) return alert("enter admin secret");
    const r = await fetch("/api/apply-badge", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ adminSecret, contractorId: id, badge })});
    const j = await r.json();
    if (j.ok) alert("Badge applied");
    else alert("Failed to apply badge: " + (j.error || "unknown"));
  });

  // open contractor
  list.addEventListener("click", (e)=>{
    if (e.target.matches(".open")) {
      const id = e.target.dataset.id;
      window.open(`/c/${id}`, "_blank");
    }
    if (e.target.matches(".badge")) {
      const id = e.target.dataset.id;
      document.getElementById("badge-id").value = id;
      document.getElementById("admin-secret").focus();
    }
  });

});
