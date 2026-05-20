mAmI — Coming Soon Website
===========================

FILES
-----
index.html      Main Coming Soon page (https://mami.ae)
privacy.html    Privacy Policy page  (https://mami.ae/privacy)
assets/logo.png Pink lotus mAmI logo  ← YOU MUST ADD THIS FILE

ONE STEP BEFORE DEPLOY
----------------------
Save the mAmI lotus logo image as:

    C:\Users\gowth\mami-website\assets\logo.png

Use the high-resolution lotus PNG you already have (the one with the
pink lotus and the "mAmI" wordmark, or just the lotus mark — either
works; the wordmark is recreated in the page header anyway).

PREVIEW LOCALLY
---------------
Easiest: double-click index.html (opens in browser).

For a proper local server (recommended to test mobile via your phone):
    cd C:\Users\gowth\mami-website
    python -m http.server 8000
    → open http://localhost:8000

DEPLOY (free, HTTPS, ~5 minutes)
--------------------------------
Option A — Netlify Drop (fastest):
    1. Go to https://app.netlify.com/drop
    2. Drag the entire mami-website folder onto the page
    3. Done. You get a live HTTPS URL instantly.
    4. Site settings → Domain management → add your custom domain (mami.ae)

Option B — Vercel:
    1. Install: npm i -g vercel
    2. In this folder: vercel
    3. Follow the prompts.

Option C — Cloudflare Pages:
    1. Push the folder to a GitHub repo
    2. Cloudflare Pages → Create project → connect repo

All three give free HTTPS automatically (Apple/Google requirement).

DOMAIN CHECKLIST FOR APPLE/GOOGLE
---------------------------------
[ ] Homepage live at https://mami.ae
[ ] Privacy page live at https://mami.ae/privacy
[ ] HTTPS padlock visible in browser
[ ] Mobile loads without horizontal scroll
[ ] hello@mami.ae email is real & monitored

WIRING THE EMAIL FORM (REQUIRED to collect signups)
---------------------------------------------------
The signup form is wired to Getform but uses a PLACEHOLDER endpoint.
Submissions will FAIL until you replace it. To activate:

    1. Sign up at https://getform.io (free tier: 50 submissions/month)
    2. Create a new form → copy the endpoint URL
       (looks like:  https://getform.io/f/abcdefgh)
    3. Open index.html and find this line near the bottom:

           const FORM_ENDPOINT = 'https://getform.io/f/YOUR_FORM_ID_HERE';

    4. Replace YOUR_FORM_ID_HERE with your actual form ID.

While the placeholder is in place, valid submissions will show a red
error message telling visitors to email hello@mami.ae instead.

— Brand guide used —
Background    #FBF5F2  (warm cream)
Ink           #2A1820  (deep)
Mulberry      #4A1530  (wordmark)
Rose          #E89BB4  (accent)
Rose deep     #D77A98
Petal         #FBE8EE
Fonts         Fraunces (display) + DM Sans (body)
