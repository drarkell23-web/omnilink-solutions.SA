document.getElementById("register").addEventListener("click", async () => {
  const company_name = document.getElementById("company_name").value.trim();
  const contact_name = document.getElementById("contact_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const pin = document.getElementById("pin").value.trim();

  if ((!email && !phone) || !password || !pin) {
    return alert("Provide email or phone, password and 3-digit PIN.");
  }
  if (!/^\d{3}$/.test(pin)) return alert("PIN must be exactly 3 digits.");

  const body = { company_name, contact_name, email: email || undefined, phone: phone || undefined, password, pin };

  const r = await fetch("/api/contractor", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!j.ok) return alert(j.error || "Registration failed");

  // save contractor_id locally and auto-login
  if (j.contractor && j.contractor.id) localStorage.setItem("contractor_id", j.contractor.id);

  // Attempt login
  const loginRes = await fetch("/api/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email: email || null, phone: phone || null, password, pin, remember: true })
  });
  const loginJson = await loginRes.json();
  if (loginJson.ok) {
    window.location.href = "/contractor-dashboard.html";
  } else {
    alert("Registered but login failed: " + (loginJson.error||""));
    window.location.href = "/contractor-login.html";
  }
});
