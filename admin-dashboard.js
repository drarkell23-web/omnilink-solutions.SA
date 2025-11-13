const supabase = supabase.createClient(
    "https://obmbklanktevawuymkbq.supabase.co",
    "YOUR_PUBLIC_ANON_KEY"
);

function showPage(id){
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

/* LOAD DATA */
async function loadDashboard(){
    const contractors = await (await fetch("/api/contractors")).json();
    const services = await (await fetch("/api/services")).json();
    const leads = await (await fetch("/api/logs/leads")).json();
    const reviews = await (await fetch("/api/logs/reviews")).json();

    document.getElementById("countContractors").textContent = contractors.contractors.length;
    document.getElementById("countLeads").textContent = leads.length;
    document.getElementById("countReviews").textContent = reviews.length;

    renderContractors(contractors.contractors);
    renderTop(contractors.contractors);
    renderLeads(leads);
    renderReviews(reviews);
}

function renderTop(contractors){
    const cont = contractors
        .filter(c=>c.badge==="platinum" || c.badge==="diamond")
        .slice(0,3);

    let html = "";
    for (let c of cont){
        html += `
            <div class="top-card">
                <img src="${c.logo_url || '/assets/default-logo.png'}">
                <div>${c.name || 'Unknown'}</div>
                <div class="badge">${c.badge}</div>
            </div>
        `;
    }
    document.getElementById("topContractors").innerHTML = html;
}

function renderContractors(list){
    let html = "";
    for(let c of list){
        html += `
            <div class="contractor-row">
                <img src="${c.logo_url || '/assets/default-logo.png'}">
                <div class="info">
                    <b>${c.name || "No Name"}</b>
                    <div>${c.category || "No category"}</div>
                    <div>Plan: ${c.subscription || "None"}</div>
                    <div>Badge: ${c.badge || "None"}</div>
                </div>

                <button onclick="editContractor('${c.id}')">Edit</button>
            </div>
        `;
    }
    document.getElementById("contractorList").innerHTML = html;
}

function renderLeads(list){
    let html = "";
    for (let l of list){
        html += `
            <div class="lead-item">
                <b>${l.name}</b> — ${l.phone}<br>
                Service: ${l.service || "None"}<br>
                <small>${l.ts}</small>
            </div>
        `;
    }
    document.getElementById("leadList").innerHTML = html;
}

function renderReviews(list){
    let html = "";
    for (let r of list){
        html += `
            <div class="review-item">
                <b>${r.name}</b> ⭐ ${r.rating}<br>
                <div>${r.comment}</div>
            </div>
        `;
    }
    document.getElementById("reviewList").innerHTML = html;
}

async function applyBadge(){
    const id = document.getElementById("badgeContractor").value;
    const badge = document.getElementById("badgeType").value;

    await fetch("/api/apply-badge", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            adminSecret: "omni$admin_2025_KEY!@34265346597843152",
            contractorId: id,
            badge
        })
    });

    alert("Badge applied!");
}

/* Subscription + Account Control */
async function applySubscription(){
    const id = document.getElementById("subContractor").value;
    const plan = document.getElementById("subPlan").value;

    await fetch("/api/contractor", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ id, subscription:plan })
    });

    alert("Subscription updated!");
}

async function deleteAccount(){
    alert("Deleting coming in next version");
}

async function deactivateAccount(){
    alert("Deactivate coming next update.");
}

async function activateAccount(){
    alert("Activate coming next update.");
}

/* Theme control */
function applyGlobalTheme(){
    const c = document.getElementById("globalThemeColor").value;
    document.body.style.setProperty("--accent", c);
}

/* Telegram Admin Host */
async function saveAdminTelegram(){
    const token = document.getElementById("adminBotToken").value;
    const chat = document.getElementById("adminChatId").value;

    await fetch("/api/contractor", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            id:"ADMIN",
            telegramToken:token,
            telegramChatId:chat
        })
    });

    alert("Telegram host saved!");
}

function logout(){
    window.location.href = "/";
}

loadDashboard();
