const $ = sel => document.querySelector(sel);

let SERVICES = [];
let CONTRACTORS = [];
let selectedService = null;
let selectedContractor = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadServices();
  await loadContractors();
  wireChatUI();
});

// ------------------------------------------------
// LOAD SERVICES + CONTRACTORS
// ------------------------------------------------
async function loadServices() {
  try {
    const r = await fetch("/api/services");
    const j = await r.json();
    SERVICES = j.services || [];
  } catch {}
}

async function loadContractors() {
  try {
    const r = await fetch("/api/contractors");
    const j = await r.json();
    CONTRACTORS = j.contractors || [];
  } catch {}
}

// ------------------------------------------------
// UI BINDINGS
// ------------------------------------------------
function wireChatUI() {
  $("#chatOpen").onclick = () => $("#chatModal").classList.remove("hidden");
  $("#chatClose").onclick = () => $("#chatModal").classList.add("hidden");
  $("#chatSend").onclick = submitLead;

  window.addEventListener("omni-service-selected", e => {
    selectedService = e.detail;
    $("#leadService").value = selectedService.name;
  });
}

// ------------------------------------------------
// SEND LEAD
// ------------------------------------------------
async function submitLead() {
  const name = $("#leadName").value.trim();
  const phone = $("#leadPhone").value.trim();
  const email = $("#leadEmail").value.trim();
  const message = $("#leadMsg").value.trim();
  const service = $("#leadService").value.trim();

  if (!name || !phone || !service) {
    alert("Please fill name, phone and service");
    return;
  }

  const payload = {
    name,
    phone,
    email,
    message,
    service,
    contractorId: selectedContractor?.id || null,
  };

  try {
    const r = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const j = await r.json();

    if (j.ok) {
      alert("Request sent successfully.");
      $("#chatModal").classList.add("hidden");
    } else {
      alert("Failed: " + j.error);
    }
  } catch (err) {
    alert("Network error");
  }
}
