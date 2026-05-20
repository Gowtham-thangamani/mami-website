/* =================================================================
   mAmI — analytics + retargeting scaffold
   Loaded on every page. Fires nothing until the placeholder IDs
   below are replaced with real ones. That keeps the site
   compliant with the requirements doc's rule that pixels must NOT
   fire before launch + before the Privacy Policy is live.
   ================================================================= */

(() => {
  "use strict";

  // ─── CONFIGURE BEFORE LAUNCH ──────────────────────────────────
  // Replace these placeholders with the real IDs, then verify each
  // in GA4 DebugView + Meta Events Manager (+ TikTok Events Manager).
  const GA4_ID         = "G-XXXXXXXXXX";   // ← Google Analytics 4 Measurement ID
  const META_PIXEL_ID  = "";               // ← Meta (Facebook/Instagram) Pixel ID
  const TIKTOK_PIXEL_ID = "";              // ← optional — TikTok Pixel ID
  // ──────────────────────────────────────────────────────────────

  const placeholder = (v) => !v || /XXXX/i.test(v);

  /* ---- Respect cookie consent ---- */
  function consented() {
    try { return localStorage.getItem("mami.cookies") === "ok"; } catch (_) { return false; }
  }
  if (!consented()) {
    // Re-check after consent is granted. The cookie banner sets
    // localStorage on click; we listen for storage events from other
    // tabs and a custom event from this tab.
    window.addEventListener("mami:cookies-accepted", init, { once: true });
    window.addEventListener("storage", (e) => {
      if (e.key === "mami.cookies" && e.newValue === "ok") init();
    });
    return;
  }
  init();

  function init() {
    if (!placeholder(GA4_ID))         injectGA4(GA4_ID);
    if (!placeholder(META_PIXEL_ID))  injectMetaPixel(META_PIXEL_ID);
    if (!placeholder(TIKTOK_PIXEL_ID)) injectTikTokPixel(TIKTOK_PIXEL_ID);
  }

  /* ---------------------------------------------------------
     GA4 — gtag.js
     --------------------------------------------------------- */
  function injectGA4(id) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id, {
      // Respect privacy: anonymize IPs by default; the spec says
      // analytics should be light-touch.
      anonymize_ip: true,
    });

    // Light scroll-depth signal (no pinned scrub here — this is just a
    // simple "did the visitor reach 50%?" signal for funnel analysis).
    let fired = false;
    window.addEventListener("scroll", () => {
      if (fired) return;
      const h = document.documentElement;
      const p = (h.scrollTop + window.innerHeight) / h.scrollHeight;
      if (p > 0.5) {
        window.gtag("event", "scroll_depth_50");
        fired = true;
      }
    }, { passive: true });

    // CTA-click signal — buttons that send the user to the waitlist
    document.querySelectorAll('a[href*="#coda"], a.cta-pill').forEach((a) => {
      a.addEventListener("click", () => window.gtag("event", "cta_waitlist_click"));
    });
  }

  /* ---------------------------------------------------------
     Meta Pixel — fbevents.js
     --------------------------------------------------------- */
  function injectMetaPixel(id) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", id);
    window.fbq("track", "PageView");

    // Waitlist + contact form submissions
    document.addEventListener("submit", (e) => {
      const form = e.target;
      if (form.matches(".waitlist-form")) window.fbq("track", "Lead", { content_name: "Waitlist" });
      if (form.matches(".contact-form"))  window.fbq("track", "Contact");
    }, true);
  }

  /* ---------------------------------------------------------
     TikTok Pixel — ttq
     --------------------------------------------------------- */
  function injectTikTokPixel(id) {
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
        ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var o = document.createElement("script");
        o.type = "text/javascript"; o.async = !0; o.src = r + "?sdkid=" + e + "&lib=" + t;
        var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a);
      };
      ttq.load(id);
      ttq.page();
    }(window, document, "ttq");
  }
})();
