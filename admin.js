/* Admin Dashboard Logic — Service Point Solutions */

(async function () {

  // Generic fetch wrapper
  async function api(url, options = {}) {
    const r = await fetch(url, options);
    let t = await r.text();
    try { return JSON.parse(t); } catch { return null; }
  }

  // Load Overview Stats
  async function loadOverview() {
    const j = await api("/api/analytics");
    if (!j || !j.ok) return;

    document.getElementById("total-contractors").innerText = j.totals.contractors;
    document.getElementById("total-leads").innerText = j.totals.leads;
    document.getElementById("total-reviews").innerText = j.totals.reviews;
  }

  // Load Contractors
  async function loadContractors() {
    const j = await api("/api/contractors");
    if (!j || !j.ok) return;

    const list = j.contractors;
    if (!list.length) {
      document.getElementById("contractor-list").innerHTML = "<p>No contractors found.</p>";
      return;
    }

    document.getElementById("contractor-list").innerHTML = list.map(c => `
      <div class="card" style="margin-bottom:16px; padding:16px;">
        <h2>${c.company_name || c.contact_name || "Contractor"}</h2>
        <p><strong>Email:</strong> ${c.email || "-"}</p>
        <p><strong>Phone:</strong> ${c.phone || "-"}</p>
        <p><strong>Verified:</strong> ${c.verified ? "✔️" : "❌"}</p>

        <button onclick="verifyContractor('${c.id}', true)">Verify</button>
        <button onclick="verifyContractor('${c.id}', false)">Unverify</button>
        <button onclick="deleteContractor('${c.id}')" style="background:#7b0a0a; color:white;">Delete</button>
      </div>
    `).join("");
  }

  // Load Leads
  async function loadLeads() {
    const j = await api("/api/logs/leads");
    if (!j) return;

    document.getElementById("lead-list").innerHTML = j.map(l => `
      <div class="card" style="margin-bottom:16px; padding:16px;">
        <h3>${l.name}</h3>
        <p><strong>Phone:</strong> ${l.phone}</p>
        <p><strong>Service:</strong> ${l.service}</p>
        <p>${l.message}</p>
        <small>${l.ts}</small>

        <button onclick="deleteLead('${l.ts}')">Delete Lead</button>
      </div>
    `).join("");
  }

  // Load Blocked Users
  async function loadBlocked() {
    const j = await api("/api/logs/blocked");
    if (!j) return;

    if (!j.length) {
      document.getElementById("blocked-list").innerHTML = "<p>No blocked users.</p>";
      return;
    }

    document.getElementById("blocked-list").innerHTML = j.map(b => `
      <div class="card" style="padding:12px; margin-bottom:12px;">
        <p><strong>Phone:</strong> ${b.phone || "-"}</p>
        <p><strong>Email:</strong> ${b.email || "-"}</p>
        <p><strong>Reason:</strong> ${b.reason || "-"}</p>
        <small>${b.ts}</small>
      </div>
    `).join("");
  }

  // Load Logs
  async function loadLogs() {
    const j = await api("/api/logs/admin_actions");
    if (!j) return;

    document.getElementById("log-view").innerHTML = j.map(l => `
      <div class="card" style="margin-bottom:12px; padding:12px;">
        <p><strong>Action:</strong> ${l.action}</p>
        <p><strong>ID:</strong> ${l.contractor_id || l.ts || "-"}</p>
        <small>${l.ts}</small>
      </div>
    `).join("");
  }

  // API Actions
  window.verifyContractor = async (id, state) => {
    await api("/api/verify-contractor", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ contractor_id:id, verify:state })
    });
    loadContractors();
  };

  window.deleteContractor = async (id) => {
    if (!confirm("Delete this contractor?")) return;
    await api(`/api/contractor/${id}`, {
      method: "DELETE",
      headers: {"Content-Type":"application/json"}
    });
    loadContractors();
  };

  window.deleteLead = async (ts) => {
    if (!confirm("Delete this lead?")) return;
    await api(`/api/lead`, {
      method: "DELETE",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ ts })
    });
    loadLeads();
  };

  // Logout
  document.getElementById("logout").addEventListener("click", () => {
    document.cookie = "token=; Max-Age=0; path=/;";
    window.location.href = "/admin-login.html";
  });

  // Initial loads
  loadOverview();
  loadContractors();
  loadLeads();
  loadBlocked();
  loadLogs();

})();
