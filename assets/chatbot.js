// assets/chatbot.js
// Lightweight chat UI glue that complements main.js. If you already have a chatbot.js with more features
// this file keeps behaviour minimal and safe.

const $ = s => document.querySelector(s);

document.addEventListener('DOMContentLoaded', ()=> {
  // wire chat open from both button and the floating button (if present)
  const openBtn = $('#chatOpen') || document.querySelector('.chat-open-btn');
  if(openBtn) openBtn.addEventListener('click', ()=> {
    const modal = $('#chatModal');
    if(modal) modal.classList.remove('hidden');
  });

  const closeBtn = $('#chatClose');
  if(closeBtn) closeBtn.addEventListener('click', ()=> {
    const modal = $('#chatModal');
    if(modal) modal.classList.add('hidden');
  });

  // also wire close on Escape
  document.addEventListener('keydown', (e)=> { if(e.key === 'Escape') { const m = $('#chatModal'); if(m) m.classList.add('hidden'); } });
});
