import { supabase } from "./supabase-client.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Enter your details");
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("❌ Login failed: " + error.message);
        return;
    }

    window.location.href = "/contractor-dashboard.html";
});
