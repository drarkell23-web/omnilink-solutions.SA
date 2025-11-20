// UPDATED server.js (integration-ready)
// Use on your main server (Render or local). DO NOT include secrets here; put them in .env
import express from "express";
import fileUpload from "express-fileupload";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.warn("Supabase not configured. Server will operate in fallback mode for demo.");
}

const supabase = createClient(SUPABASE_URL||'', SERVICE_ROLE||'');

// serve static
app.use(express.static("public"));
app.use(express.static("."));

// ADMIN CREATE CONTRACTOR - hashes password and inserts
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    const { company, phone, password, telegram } = req.body;
    if (!company || !phone || !password) return res.json({ ok:false, error:'missing' });
    const password_hash = await bcrypt.hash(password, 10);
    const payload = { company, phone, password_hash, telegram_chat_id: telegram||null, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from('contractors').insert([payload]).select().maybeSingle();
    if (error) return res.json({ ok:false, error: error.message });
    res.json({ ok:true, contractor: data });
  } catch (e) { res.json({ ok:false, error: String(e) }); }
});

// CONTRACTOR LOGIN (phone+password) - checks hashed password
app.post("/api/contractor/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const { data, error } = await supabase.from('contractors').select('*').eq('phone', phone).maybeSingle();
    if (error || !data) return res.json({ ok:false, error:'not found' });
    const match = await bcrypt.compare(password, data.password_hash || data.password || '');
    if (!match) return res.json({ ok:false, error:'invalid password' });
    res.json({ ok:true, contractor: data });
  } catch (e) { res.json({ ok:false, error: String(e) }); }
});

// LEAD endpoint - saves to supabase and notifies telegram
app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone, email, service, message, contractorId, source } = req.body;
    if (!name || !phone || !service) return res.json({ ok:false, error:'missing required' });
    const row = { name, phone, email: email||null, service, message: message||null, contractor_id: contractorId||null, source: source||'web', created_at: new Date().toISOString() };
    const { data, error } = await supabase.from('leads').insert([row]).select().maybeSingle();
    if (error) console.warn('supabase lead save err', error.message);
    // notify telegram
    try {
      let chatTarget = TELEGRAM_CHAT_ADMIN;
      if (contractorId) {
        const { data: c } = await supabase.from('contractors').select('telegram_chat_id').eq('id', contractorId).maybeSingle();
        if (c && c.telegram_chat_id) chatTarget = c.telegram_chat_id;
      }
      if (process.env.TELEGRAM_BOT_TOKEN && chatTarget) {
        const payload = { chat_id: chatTarget, text: `New lead: ${name} — ${phone} — ${service} — ${message||''}` };
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      }
    } catch(e){ console.warn('tg err', e.message) }
    res.json({ ok:true, lead: data||row });
  } catch (e) { res.json({ ok:false, error:String(e) }); }
});

app.get('/api/contractors', async (req,res)=>{
  try{ const { data, error } = await supabase.from('contractors').select('*').order('created_at',{ascending:false}).limit(1000); if(error) return res.json({ok:false,error:error.message}); res.json({ok:true, contractors:data}); }catch(e){res.json({ok:false,error:String(e)})}
});

app.get('/api/leads', async (req,res)=>{
  try{ const { data, error } = await supabase.from('leads').select('*').order('created_at',{ascending:false}).limit(1000); if(error) return res.json({ok:false,error:error.message}); res.json({ok:true, leads:data}); }catch(e){res.json({ok:false,error:String(e)})}
});

const PORT = process.env.PORT||3000;
app.listen(PORT, ()=> console.log('Server running on', PORT));
