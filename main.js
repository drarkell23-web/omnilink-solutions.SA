const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

// ------------------------------------------------
// LOAD SERVICES
// ------------------------------------------------
async function loadServices() {
  try {
    const res = await fetch("/api/services");
    const j = await res.json();

    SERVICES = j.services || [];

    renderCategories();
    renderServices();
  } catch (err) {
    console.warn("Service load failed", err);
    $("#servicesGrid").textContent = "Services unavailable.";
  }
}

// ------------------------------------------------
// LOAD CONTRACTORS
// ------------------------------------------------
async function loadContractors() {
  try {
    const res = await fetch("/api/contractors");
    const j = await res.json();

    CONTRACTORS = j.contractors || [];
    renderTopContractors();
  } catch (e) {
    console.warn("Contractors load failed", e);
  }
}

// ------------------------------------------------
// LOAD REVIEWS
// ------------------------------------------------
async function loadReviews() {
  try {
    const res = await fetch("/api/review");
    const j = await res.json();

    REVIEWS = j.reviews || [];
    renderTestimonials();
  } catch (e) {
    console.warn("Reviews load failed", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadServices();
  await loadContractors();
  await loadReviews();
  wireButtons();
});

// ------------------------------------------------
// RENDER UI
// ------------------------------------------------
function renderCategories() {
  const el = $("#categories");
  el.innerHTML = "";

  const cats = [...new Set(SERVICES.map(s => s.category || "Other"))];

  cats.forEach(cat => {
    const d = document.createElement("div");
    d.className = "cat";
    d.textContent = cat;

    d.addEventListener("click", () => {
      $$(".service-pill").forEach(p => {
        p.style.display = p.dataset.cat === cat ? "inline-block" : "none";
      });
    });

    el.appendChild(d);
  });
}

function renderServices() {
  const el = $("#servicesGrid");
  el.innerHTML = "";

  SERVICES.forEach(s => {
    const d = document.createElement("div");
    d.className = "service-pill";
    d.dataset.cat = s.category;
    d.textContent = s.name;

    d.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("service-click", { detail: s }));
      $("#chatOpen").click();

      setTimeout(() => {
        $("#leadService").value = s.name;
        window.dispatchEvent(new CustomEvent("omni-service-selected", { detail: s }));
      }, 200);
    });

    el.appendChild(d);
  });
}

function renderTopContractors() {
  const el = $("#topList");
  el.innerHTML = "";

  const list = CONTRACTORS.slice(0, 6);

  list.forEach(c => {
    const row = document.createElement("div");
    row.innerHTML = `
      <strong>${c.company}</strong>
      <div class="muted">${c.service || ""}</div>
    `;
    el.appendChild(row);
  });
}

function renderTestimonials() {
  const el = $("#testimonials");
  if (!el) return;

  el.innerHTML = "";

  REVIEWS.slice(0, 6).forEach(r => {
    const d = document.createElement("div");
    d.innerHTML = `
      <strong>${r.reviewer_name}</strong> — ${r.rating}★
      <div>${r.comment}</div>
    `;
    el.appendChild(d);
  });
}

// ------------------------------------------------
// BUTTONS
// ------------------------------------------------
function wireButtons() {
  const bAdmin = $("#btnAdmin");
  if (bAdmin) bAdmin.onclick = () => location.href = "/admin-dashboard.html";

  const bContractor = $("#btnContractor");
  if (bContractor) bContractor.onclick = () => location.href = "/contractor-dashboard.html";
}
