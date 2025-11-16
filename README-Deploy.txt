1️⃣ Setup
---------
cd functions
npm install
cd ..

firebase login
firebase init (enable Firestore + Functions + Hosting)

2️⃣ Set Admin
-------------
Use your service account or CLI script:

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
admin.auth().setCustomUserClaims('<ADMIN_UID>', { admin: true }).then(()=>console.log('done'));

3️⃣ Deploy
----------
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only hosting

4️⃣ Admin Config
----------------
Sign in as your admin user on the site → go to Admin Panel (admin-review.html)
Paste your Telegram BOT Token and Chat ID → Save & Test
Settings will be stored in Firestore securely at settings/tele.
