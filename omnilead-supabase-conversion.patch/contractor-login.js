document.getElementById("login").addEventListener("click", async () => {
  const ep = document.getElementById("ep").value.trim();
  const password = document.getElementById("password").value;
  const pin = document.getElementById("pin").value.trim();
  const remember = document.getElementById("remember").checked;

  if (!ep || !password || !pin) return alert("Enter email/phone, password, and 3-digit PIN.");
  if (!/^\d{3}$/.test(pin)) return alert("PIN must be 3 digits.");

  const isEmail = ep.includes("@");
  const body = { email: isEmail ? ep : null, phone: isEmail ? null : ep, password, pin, remember };

  const r = await fetch("/api/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });

  const j = await r.json();
  if (!j.ok) return alert(j.error || "Login failed");
  if (j.contractor && j.contractor.id) localStorage.setItem("contractor_id", j.contractor.id);
  window.location.href = "/contractor-dashboard.html";
});
