import { supabase } from '../supabase-client.js';


export function openSignupModal(){
const modal = document.getElementById('signup-modal');
if (modal) modal.style.display = 'flex';
}
export function closeSignupModal(){
const modal = document.getElementById('signup-modal');
if (modal) modal.style.display = 'none';
}


// Signup submit handler
const submitBtn = document.getElementById('signup-submit');
if (submitBtn) submitBtn.addEventListener('click', async () => {
const email = document.getElementById('signup-email').value.trim();
const password = document.getElementById('signup-password').value.trim();
const company = document.getElementById('signup-company').value.trim();
const phone = document.getElementById('signup-phone').value.trim();
const service = document.getElementById('signup-service').value.trim();
const msg = document.getElementById('signup-msg');


if (!email || !password) {
if (msg) msg.innerText = 'Please enter email and password.';
return;
}


try {
// create auth user
const { data, error } = await supabase.auth.signUp({ email, password });
if (error) {
if (msg) msg.innerText = error.message;
return;
}


// insert contractor profile
const profile = {
id: data.user.id,
email,
name: company || null,
phone: phone || null,
main_service: service || null,
created_at: new Date().toISOString()
};


const { error: upserr } = await supabase.from('contractors').upsert(profile);
if (upserr) {
if (msg) msg.innerText = upserr.message || JSON.stringify(upserr);
return;
}


if (msg) msg.style.color = 'green';
if (msg) msg.innerText = 'Registration success — please check your email to confirm.';


// auto close after short delay
setTimeout(()=>{
closeSignupModal();
window.location.href = '/contractor-dashboard.html';
},1200);


} catch (e) {
if (msg) msg.innerText = String(e);
}
});
