<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Contractor — Omni</title>
<link rel="stylesheet" href="theme.css">
</head>
<body>
<div style="max-width:1000px;margin:18px auto">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;gap:12px;align-items:center">
      <img id="logoUploadPreview" src="https://via.placeholder.com/80" style="height:48px;width:48px;border-radius:8px"/>
      <div>
        <div style="font-weight:800">Contractor Portal</div>
        <div class="small">Complete your profile</div>
      </div>
    </div>
    <div>
      <button class="btn" onclick="location.href='dashboard.html'">Dashboard</button>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 320px;gap:12px;margin-top:12px">
    <div>
      <div class="card">
        <div style="font-weight:800">Profile</div>
        <input id="name" class="small-input" placeholder="Company / Name"><br><br>
        <input id="phone" class="small-input" placeholder="Phone"><br><br>
        <select id="service" class="small-input">
          <option value="property">Property Contractor</option>
          <option value="cleaning">Cleaning</option>
          <option value="security">Security</option>
        </select><br><br>
        <div id="specificFields"></div>
        <br>
        <button id="saveProfile" class="btn">Save Profile</button>
      </div>

      <div class="card" style="margin-top:12px">
        <div style="font-weight:800">Chat & Messaging</div>
        <div id="chatBox" style="height:220px;overflow:auto;background:#050417;padding:8px;border-radius:8px;margin-top:8px"></div>
        <input id="chatMsg" class="small-input" placeholder="Message"><button id="chatSend" class="btn">Send</button>
      </div>
    </div>

    <aside>
      <div class="card">
        <div style="font-weight:800">Billing</div>
        <div class="small">Status: <span id="pbStatus">Free</span></div>
        <div style="margin-top:8px">
          <button id="setBadge" class="btn">Set Badge</button>
        </div>
      </div>
    </aside>
  </div>
</div>

<script type="module">
import { upsertContractor } from "./Firebase-bridge.js";

function renderFields(s){
  const el = document.getElementById('specificFields');
  el.innerHTML = '';
  if (s === 'property'){
    el.innerHTML = `<select class="small-input"><option>House</option><option>Apartment</option><option>Commercial</option></select>`;
  } else if (s === 'cleaning'){
    el.innerHTML = `<label class="small">Equipment</label><input class="small-input" placeholder="Equipment details">`;
  } else {
    el.innerHTML = `<input class="small-input" placeholder="Speciality">`;
  }
}

document.getElementById('service').addEventListener('change', e=>renderFields(e.target.value));
renderFields(document.getElementById('service').value);

document.getElementById('saveProfile').addEventListener('click', async ()=>{
  const p = {
    id: "c_" + Date.now(),
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    service: document.getElementById('service').value,
    created: new Date().toISOString()
  };
  await upsertContractor(p.phone||p.id, p);
  alert("Profile saved. Admin will be notified.");
});

// chat send (writes to Firestore messages)
document.getElementById('chatSend').addEventListener('click', async ()=>{
  const t = document.getElementById('chatMsg').value.trim();
  if (!t) return;
  // For demo just append locally
  const box = document.getElementById('chatBox');
  const el = document.createElement('div'); el.textContent = `You: ${t}`; box.prepend(el);
  document.getElementById('chatMsg').value='';
});
</script>
</body>
</html>
