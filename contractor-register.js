import { supabase } from "./supabase-client.js";

document.getElementById("registerBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const business_name = document.getElementById("business_name").value.trim();

    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        alert("❌ Registration failed: " + error.message);
        return;
    }

    // also store profile in contractors table
    await supabase.from("contractors").insert({
        id: data.user.id,
        business_name,
        email
    });

    alert("✅ Registered! Check email");
});
