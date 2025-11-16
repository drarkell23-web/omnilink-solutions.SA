import { supabase } from "./supabase-client.js";

async function loadDashboard() {

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = "/contractor-login.html";
        return;
    }

    // Load contractor profile
    const { data: contractor } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", user.id)
        .single();

    document.getElementById("businessName").innerText = contractor.business_name;

    // Load leads assigned to this contractor
    const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("contractor_id", user.id);

    document.getElementById("leadCount").innerText = leads.length;

    // Load reviews
    const { data: reviews } = await supabase
        .from("reviews")
        .select("*")
        .eq("contractor_id", user.id);

    document.getElementById("reviewCount").innerText = reviews.length;
}

loadDashboard();
