// ============================
// Contractor Dashboard Logic
// Service Point Solutions
// ============================

(function () {

  const contractorId = localStorage.getItem("contractor_id");

  if (!contractorId) {
    window.location.href = "/contractor-login.html";
    return;
  }

  // Helper for safe JSON
  async function api(url, options = {}) {
    const res = await fetch(url, options);
    let text = await res.text();
    try { return JSON.parse(text); }
    catch { return null; }
  }

  // Profile
  async function loadProfile() {
    const data = await api(`/api/contractor/${contractorId}`);
    if (!data || !data.contractor) {
      document.getElementById("profile-area").innerHTML = "<p>Unable to load profile.</p>";
      return;
    }
    const c = data.contractor;
    document.getElementById("profile-area").innerHTML = `
      <div class="card" style="padding:20px;">
        <h2>${c.company_name || c.contact_name || "Your Profile"}</h2>
        <p><strong>Email:</strong> ${c.email || "-"}</p>
        <p><strong>Phone:</strong> ${c.phone || "-"}</p>
        <p><strong>Main Service:</strong> ${c.service_primary || "-"}</p>
      </div>
    `;
  }

  // Leads
  async function loadLeads() {
    const data = await api("/api/logs/leads");
    if (!data || !Array.isArray(data)) {
      document.getElementById("lead-list").innerHTML = "<p>No leads found.</p>";
      return;
    }

    const filtered = data.filter(l => l.contractor_id === contractorId);
    document.getElementById("lead-count").innerText = filtered.length;

    if (filtered.length === 0) {
      document.getElementById("lead-list").innerHTML = "<p>You have no leads yet.</p>";
      return;
    }

    document.getElementById("lead-list").innerHTML = filtered.map(l => `
      <div class="card" style="margin-bottom:16px;padding:16px;">
        <h3>${l.name}</h3>
        <p><strong>Phone:</strong> ${l.phone}</p>
        <p><strong>Service:</strong> ${l.service || "N/A"}</p>
        <p>${l.message || ""}</p>
        <small>${l.ts ? new Date(l.ts).toLocaleString() : ""}</small>
      </div>
    `).join("");
  }

  // Reviews
  async function loadReviews() {
    const data = await api(`/api/contractor/${contractorId}`);
    const reviews = data && Array.isArray(data.reviews) ? data.reviews : [];

    document.getElementById("review-count").innerText = reviews.length;

    if (reviews.length === 0) {
      document.getElementById("review-list").innerHTML = "<p>No reviews yet.</p>";
      return;
    }

    document.getElementById("review-list").innerHTML = reviews.map(r => `
      <div class="card" style="margin-bottom:16px;padding:16px;">
        <h3>⭐ ${r.rating} — ${r.reviewer_name}</h3>
        <p>${r.comment || ""}</p>
      </div>
    `).join("");
  }

  // Logout
  document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem("contractor_id");
    document.cookie = "token=; Max-Age=0; path=/;";
    window.location.href = "/contractor-login.html";
  });

  loadProfile();
  loadLeads();
  loadReviews();

})();
