/* app.js
   Simple SPA logic: generates categories + 200+ services, populates UI, simple interactivity.
   Replace SUPABASE_URL and SUPABASE_ANON_KEY with your values to hook up real Supabase.
*/

const SUPABASE_URL = "https://YOUR_SUPABASE_URL.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ---- Mocked or generated content (replace with live fetch from Supabase if you want) ----
const fakeLeadsCount = 2438;       // made-up realistic number for "leads so far"
const fakeContractors = 128;      // made-up realistic number for "contractors credited"
const popularServicesSeed = [
  "Plumbing - Emergency",
  "Electrician - Home",
  "House Cleaning (Deep Clean)",
  "Appliance Repair - Fridge",
  "Garden Maintenance"
];

const categories = [
  "Home Repair",
  "Electrical",
  "Plumbing",
  "Cleaning",
  "Landscaping",
  "IT & Networking",
  "Appliance Services",
  "Carpentry",
  "Painting",
  "Wellness & Health",
  "Automotive",
  "Moving & Storage",
  "Pest Control",
  "HVAC",
  "Roofing",
  "Flooring",
  "Decor & Furnishings",
  "Security",
  "Commercial Services",
  "Other Services"
];

// generate 220 services across categories
const services = [];
(function generateServices(){
  let id = 1;
  for (let c=0;c<categories.length;c++){
    const cat = categories[c];
    // produce between 8 and 16 services per category
    const count = 10 + Math.floor(Math.random()*10);
    for (let i=0;i<count;i++){
      const service = {
        id: id++,
        title: `${cat} — ${["Standard","Premium","Emergency","Express","Same-day"][Math.floor(Math.random()*5)]} Service ${i+1}`,
        category: cat,
        description: `Professional ${cat.toLowerCase()} service. Experienced contractors, verified reviews.`,
        price_estimate: `${50 + Math.floor(Math.random()*450)} - ${200 + Math.floor(Math.random()*800)} ZAR`,
        popularity: Math.floor(Math.random()*1000)
      };
      services.push(service);
    }
  }
  // ensure 200+ total
  while(services.length < 220){
    services.push({
      id:id++,
      title:`Misc Service ${id}`,
      category: "Other Services",
      description: "Miscellaneous service",
      price_estimate: `${20 + Math.floor(Math.random()*300)} ZAR`,
      popularity: Math.floor(Math.random()*300)
    });
  }
})();

// ---- UI bindings ----
const categoryListEl = document.getElementById('category-list');
const servicesGridEl = document.getElementById('services-grid');
const popularListEl = document.getElementById('popular-list');
const leadsValueEl = document.getElementById('leads-value');
const contractorsValueEl = document.getElementById('contractors-value');
const whyValueEl = document.getElementById('why-value');
const reviewsEl = document.getElementById('reviews');
const searchEl = document.getElementById('search');
const sortEl = document.getElementById('sort');
const emptyMsgEl = document.getElementById('empty-msg');

// top stat init
leadsValueEl.innerText = fakeLeadsCount.toLocaleString();
contractorsValueEl.innerText = fakeContractors.toLocaleString();
whyValueEl.innerText = "Fast local contractors, vetted & rated. Bookings & chat integrated.";

// populate categories
function renderCategories(){
  // "All Services" already present as top button in HTML
  categories.forEach(cat=>{
    const btn = document.createElement('div');
    btn.className = 'category-item';
    btn.innerText = cat;
    btn.addEventListener('click', ()=>loadCategory(cat));
    categoryListEl.appendChild(btn);
  });
}
renderCategories();

// popular services (top 8 by popularity + seeded names)
function renderPopular(){
  const top = services.slice().sort((a,b)=>b.popularity - a.popularity).slice(0,8);
  const combined = Array.from(new Set([...popularServicesSeed, ...top.map(s=>s.title)])).slice(0,8);
  popularListEl.innerHTML = '';
  combined.forEach((p,idx)=>{
    const li = document.createElement('li');
    li.className = 'popular-item';
    li.innerHTML = `<div>${idx+1}. ${p}</div><div style="font-weight:700">${(Math.floor(Math.random()*50)+5)} reqs</div>`;
    popularListEl.appendChild(li);
  });
}
renderPopular();

// reviews (5 alternating)
const sampleReviews = [
  {name:"Samantha J","meta":"5★ — 2 days ago","text":"Excellent service. Quick turnaround and friendly contractor."},
  {name:"Marcus P","meta":"4★ — 5 days ago","text":"Good job. A little late but fixed everything."},
  {name:"Talia R","meta":"5★ — 1 week ago","text":"Highly recommend. Clean, professional and affordable."},
  {name:"Riaan V","meta":"5★ — 3 weeks ago","text":"Great communication. Will use again."},
  {name:"Aisha M","meta":"4★ — 1 month ago","text":"Solid work. Minor follow-up required but handled promptly."}
];
function renderReviews(){
  reviewsEl.innerHTML = '';
  sampleReviews.forEach(r=>{
    const d = document.createElement('div');
    d.className = 'review';
    d.innerHTML = `<div style="font-weight:700">${r.name}</div>
                   <div class="meta">${r.meta}</div>
                   <div style="margin-top:6px">${r.text}</div>`;
    reviewsEl.appendChild(d);
  });
}
renderReviews();

// load a category's services into center
let currentLoaded = null;
function loadCategory(cat){
  currentLoaded = cat;
  document.getElementById('empty-msg').hidden = true;
  const filtered = services.filter(s=>s.category === cat);
  renderServices(filtered);
}

// render service cards
function renderServices(list){
  servicesGridEl.innerHTML = '';
  if (!list || list.length===0){
    servicesGridEl.innerHTML = '';
    emptyMsgEl.hidden = false;
    return;
  }
  emptyMsgEl.hidden = true;
  list.forEach(s=>{
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-title">${s.title}</div>
      <div class="service-meta">${s.category} • Est: ${s.price_estimate}</div>
      <div class="service-desc">${s.description}</div>
      <div class="service-actions">
        <button class="btn small" onclick="bookService(${s.id})">Book</button>
        <button class="btn small" onclick="viewDetails(${s.id})">Details</button>
      </div>
    `;
    servicesGridEl.appendChild(card);
  });
}

// search & sort
searchEl.addEventListener('input', ()=>{
  if(!currentLoaded) return;
  const term = searchEl.value.toLowerCase();
  const list = services.filter(s => s.category === currentLoaded && (s.title.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)));
  renderServices(applySort(list));
});
sortEl.addEventListener('change', ()=>{
  if(!currentLoaded) return;
  const list = services.filter(s => s.category === currentLoaded);
  renderServices(applySort(list));
});
function applySort(list){
  if(sortEl.value === 'alpha') return list.slice().sort((a,b)=>a.title.localeCompare(b.title));
  return list.slice().sort((a,b)=>b.popularity - a.popularity);
}

// simple handlers for booking/details/admin etc.
window.bookService = function(id){
  const svc = services.find(s=>s.id===id);
  alert(`Book requested for: ${svc.title}\n\n(This is a demo. Hook up Supabase / your booking flow.)`);
}

window.viewDetails = function(id){
  const svc = services.find(s=>s.id===id);
  alert(`Service details:\n\n${svc.title}\n${svc.description}\nEstimate: ${svc.price_estimate}`);
}

// contractor signup/login buttons
document.getElementById('contractor-signup').addEventListener('click', ()=>{
  alert('Contractor Signup — open your signup modal or redirect to /contractor-signup (Not implemented in demo)');
});
document.getElementById('contractor-login').addEventListener('click', ()=>{
  alert('Contractor Login — open your login modal or redirect to /contractor-login (Not implemented in demo)');
});
document.getElementById('customer-reviews').addEventListener('click', ()=>{
  const el = document.querySelector('.reviews-list');
  el.scrollIntoView({behavior:'smooth'});
});
document.getElementById('admin-btn').addEventListener('click', ()=>{
  alert('Admin area — implement authentication and admin routes in your app.');
});

// OPTIONAL: Example small Supabase init to replace placeholders (uncomment when @supabase/supabase-js is available)
/*
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function fetchLeadsFromSupabase(){
  // Example: assumes table "leads" with "created_at" column
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error){ console.error(error); return; }
  // update UI
  leadsValueEl.innerText = (data && data.length) ? data.length.toLocaleString() : fakeLeadsCount;
}
*/

// initial empty message shown until user clicks category
emptyMsgEl.hidden = false;
servicesGridEl.innerHTML = '';
