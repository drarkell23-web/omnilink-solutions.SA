// /public/contractor-signup.js
import { supabase } from "/public/supabase-client.js";

// EXPOSE to button
window.signupContractor = signupContractor;

async function signupContractor() {
  const company = document.getElementById("company").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const service = document.getElementById("service").value.trim();
  const logoFile = document.getElementById("logo")?.files?.[0];

  if (!company || !email || !password || !service) {
    return alert("Please fill in all required fields.");
  }

  // 1. Create Supabase auth user
  const { data: auth, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        company,
        phone,
        service
      }
    }
  });

  if (authErr) {
    return alert("Signup failed: " + authErr.message);
  }

  const user = auth.user;

  let logoUrl = null;
  if (logoFile) {
    const fileName = `${user.id}-${Date.now()}-${logoFile.name}`;
    const { data: up, error: upErr } = await supabase.storage
      .from("logos")
      .upload(fileName, logoFile);

    if (!upErr) {
      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);
      logoUrl = urlData.publicUrl;
    }
  }

  // 2. Insert into contractors table
  await supabase.from("contractors").insert({
    auth_id: user.id,
    name: company,
    email,
    phone,
    service,
    logo_url: logoUrl,
    created_at: new Date().toISOString()
  });

  alert("Contractor account created! You may now log in.");
  window.location.href = "/auth/contractor-login.html"; 
}
