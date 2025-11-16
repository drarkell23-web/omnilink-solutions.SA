const contractorId = localStorage.getItem("contractor_id");
if (!contractorId) location.href = "/contractor-login.html";

const pages = document.querySelectorAll(".page");
const buttons = document.querySelectorAll(".side-btn");

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        pages.forEach(p => p.style.display = "none");
        document.getElementById(btn.dataset.page).style.display = "block";
    });
});

/* PROFILE LOAD -------------------------------------------------- */
async function loadProfile() {
    const res = await fetch("/api/contractor/" + contractorId);
    const j = await res.json();
    const c = j.contractor;

    if (!c) return;

    document.getElementById("company_name").value = c.company_name || "";
    document.getElementById("contact_name").value = c.contact_name || "";
    document.getElementById("phone").value = c.phone || "";
    document.getElementById("email").value = c.email || "";
    document.getElementById("service_primary").value = c.service_primary || "";
    document.getElementById("logo-preview").src = c.logo_url || "";
}
loadProfile();

/* SAVE PROFILE -------------------------------------------------- */
document.getElementById("save-profile").addEventListener("click", async () => {
    const payload = {
        id: contractorId,
        company_name: company_name.value,
        contact_name: contact_name.value,
        phone: phone.value,
        email: email.value,
        service_primary: service_primary.value
    };

    const res = await fetch("/api/contractor", {
        method:"POST",
        headers:{ "Content-Type": "application/json"},
        body: JSON.stringify(payload)
    });

    alert("Saved!");
});

/* LEADS -------------------------------------------------- */
async function loadLeads() {
    const res = await fetch("/api/logs/leads");
    const j = await res.json();

    const mine = j.filter(l => l.contractor_id === contractorId);

    document.getElementById("lead-count").textContent = mine.length;

    const list = document.getElementById("lead-list");
    list.innerHTML = "";

    mine.forEach(l => {
        const box = document.createElement("div");
        box.className = "lead-box";
        box.innerHTML = `
            <p><b>${l.name}</b> (${l.phone})</p>
            <p>${l.service}</p>
            <small>${l.message}</small>
            <hr>
        `;
        list.appendChild(box);
    });
}
loadLeads();

/* REVIEWS -------------------------------------------------- */
document.getElementById("upload-review").addEventListener("click", async () => {
    const fd = new FormData();
    fd.append("contractor_id", contractorId);
    fd.append("name", rev-name.value);
    fd.append("rating", rev-rating.value);
    fd.append("comment", rev-comment.value);

    for (const f of document.getElementById("rev-files").files)
        fd.append("images", f);

    await fetch("/api/review", { method:"POST", body:fd });

    alert("Uploaded!");
});

/* AD CREATOR -------------------------------------------------- */
document.getElementById("generate-ad").addEventListener("click", () => {
    const title = document.getElementById("ad-title").value;
    const desc = document.getElementById("ad-desc").value;

    const text = `🔥 ${title}\n\n${desc}\n\n📞 Contact: ${phone.value}\n🔧 Trusted by customers\n🌐 See reviews: https://omnilink-solutions-sa.onrender.com/c/${contractorId}`;

    document.getElementById("ad-preview").textContent = text;

    document.getElementById("copy-ad").style.display = "block";
    document.getElementById("ad-link").style.display = "block";
});

document.getElementById("copy-ad").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("ad-preview").textContent);
    alert("Copied!");
});

document.getElementById("ad-link").addEventListener("click", () => {
    navigator.clipboard.writeText(`https://omnilink-solutions-sa.onrender.com/c/${contractorId}`);
    alert("Link copied!");
});

/* PUBLIC PAGE -------------------------------------------------- */
document.getElementById("public-link").value =
    `https://omnilink-solutions-sa.onrender.com/c/${contractorId}`;

document.getElementById("copy-link").addEventListener("click", () => {
    navigator.clipboard.writeText(public-link.value);
    alert("Copied!");
});

/* LOGOUT -------------------------------------------------- */
document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem("contractor_id");
    location.href = "/contractor-login.html";
});
