/* =================================================================
   mAmI — Slow Bloom · scroll choreography
   Stack: Lenis (smooth) + GSAP + ScrollTrigger
   ================================================================= */

(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const CENTER = 300;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------------------------------------------------------
     1. Build the lotus petals procedurally
         5 rings: back, outer, middle, inner, core + stamens
     --------------------------------------------------------- */
  const RINGS = [
    {
      el: $(".ring-back"),
      count: 8,
      angleOffset: 0,
      scale: 1.50,
      shape: "#petalShapeBack",
      fill: "url(#petalBack)",
      openAngle: 75,
      closedAngle: 8,
      openScale: 1.0,
      closedScale: 0.7,
    },
    {
      el: $(".ring-outer"),
      count: 8,
      angleOffset: 22.5,
      scale: 1.32,
      shape: "#petalShape",
      fill: "url(#petalOuter)",
      openAngle: 60,
      closedAngle: 6,
      openScale: 1.0,
      closedScale: 0.75,
    },
    {
      el: $(".ring-middle"),
      count: 8,
      angleOffset: 0,
      scale: 1.05,
      shape: "#petalShape",
      fill: "url(#petalMid)",
      openAngle: 42,
      closedAngle: 4,
      openScale: 1.0,
      closedScale: 0.78,
    },
    {
      el: $(".ring-inner"),
      count: 8,
      angleOffset: 22.5,
      scale: 0.82,
      shape: "#petalShapeSmall",
      fill: "url(#petalInner)",
      openAngle: 28,
      closedAngle: 3,
      openScale: 1.0,
      closedScale: 0.82,
    },
    {
      el: $(".ring-core"),
      count: 6,
      angleOffset: 30,
      scale: 0.55,
      shape: "#petalShapeTiny",
      fill: "url(#petalCore)",
      openAngle: 14,
      closedAngle: 2,
      openScale: 1.0,
      closedScale: 0.88,
    },
  ];

  // Build all rings with per-petal rotational jitter for organic feel
  function buildPetals() {
    // Deterministic pseudo-random so the bloom looks the same on every load
    let seed = 1337;
    function rand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    RINGS.forEach((ring) => {
      if (!ring.el) return;
      ring.petals = [];
      for (let i = 0; i < ring.count; i++) {
        const baseAngle = (360 / ring.count) * i + ring.angleOffset;
        // Per-petal jitter to break the mandala symmetry
        const jitterAngle = (rand() - 0.5) * 6; // ±3°
        const jitterScale = 0.92 + rand() * 0.16; // ±8% scale variance

        const g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("class", "petal-group");
        g.setAttribute("transform", `translate(${CENTER} ${CENTER})`);

        const inner = document.createElementNS(SVG_NS, "g");
        inner.setAttribute("class", "petal-inner");

        const use = document.createElementNS(SVG_NS, "use");
        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", ring.shape);
        use.setAttribute("href", ring.shape);
        use.setAttribute("fill", ring.fill);

        const spec = document.createElementNS(SVG_NS, "use");
        spec.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#petalSpec");
        spec.setAttribute("href", "#petalSpec");
        spec.setAttribute("fill", "url(#petalSpecular)");
        spec.setAttribute("opacity", "0.85");

        inner.appendChild(use);
        inner.appendChild(spec);
        g.appendChild(inner);
        ring.el.appendChild(g);

        ring.petals.push({
          group: g,
          inner,
          baseAngle: baseAngle + jitterAngle,
          jitterScale,
        });
      }
    });
  }

  // Build stamens (gold filaments around core)
  function buildStamens() {
    const root = $(".stamens");
    if (!root) return;
    const N = 14;
    for (let i = 0; i < N; i++) {
      const angle = (360 / N) * i;
      const line = document.createElementNS(SVG_NS, "line");
      const r1 = 12;
      const r2 = 30 + (i % 2 === 0 ? 4 : 0);
      const a = (angle * Math.PI) / 180;
      line.setAttribute("x1", CENTER + Math.cos(a) * r1);
      line.setAttribute("y1", CENTER + Math.sin(a) * r1);
      line.setAttribute("x2", CENTER + Math.cos(a) * r2);
      line.setAttribute("y2", CENTER + Math.sin(a) * r2);
      line.setAttribute("stroke", "#E8C492");
      line.setAttribute("stroke-width", "0.6");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0");
      line.dataset.angle = angle;
      line.dataset.r2 = r2;
      root.appendChild(line);

      // Anther tip dot
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("cx", CENTER + Math.cos(a) * r2);
      dot.setAttribute("cy", CENTER + Math.sin(a) * r2);
      dot.setAttribute("r", "1.2");
      dot.setAttribute("fill", "#F4DEC8");
      dot.setAttribute("opacity", "0");
      root.appendChild(dot);
    }
  }

  // t in [0..1] — 0 = closed bud, 1 = fully bloomed
  function setLotusState(t) {
    RINGS.forEach((ring) => {
      if (!ring.petals) return;
      ring.petals.forEach((p) => {
        const scl = (ring.closedScale + (ring.openScale - ring.closedScale) * t) * p.jitterScale;
        p.group.setAttribute(
          "transform",
          `translate(${CENTER} ${CENTER}) rotate(${p.baseAngle}) scale(${scl})`
        );
        p.inner.setAttribute("transform", `scale(${ring.scale})`);
        const op = 0.20 + 0.80 * t;
        p.inner.setAttribute("opacity", op.toFixed(3));
      });
    });

    // Stamens fade in late (only past t > 0.55)
    const stamens = $$(".stamens line, .stamens circle");
    const f = Math.max(0, (t - 0.55) / 0.4);
    stamens.forEach((s) => s.setAttribute("opacity", (f * 0.9).toFixed(3)));
  }

  buildPetals();
  buildStamens();


  /* ---------------------------------------------------------
     1b. Probe assets/lotus.png — if it loads, swap to photo
     --------------------------------------------------------- */
  const lotusWrap = $(".lotus-wrap");
  const lotusPhoto = $(".lotus-photo");

  function probeLotusPhoto() {
    if (!lotusWrap || !lotusPhoto) return;
    const src = lotusPhoto.getAttribute("src");
    if (!src) return;

    const probe = new Image();
    probe.onload = () => {
      // Only swap if it's a real image (some servers serve a 0-byte placeholder).
      if (probe.naturalWidth > 32 && probe.naturalHeight > 32) {
        lotusWrap.classList.add("has-photo");
        // Set the bloom-tween baseline only when animation is on;
        // under reduced-motion the photo stays at its CSS rest state (opacity:1).
        if (!prefersReducedMotion) {
          gsap.set(lotusPhoto, { opacity: 0, scale: 1.06, filter: "blur(14px)", y: 24 });
        }
        // Refresh ScrollTrigger so the new visible target is measured
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }
    };
    probe.onerror = () => { /* keep procedural SVG */ };
    probe.src = src;
  }
  probeLotusPhoto();


  /* ---------------------------------------------------------
     2. Lenis smooth scroll, ticked by GSAP
     --------------------------------------------------------- */
  let lenis = null;
  if (typeof Lenis !== "undefined" && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });
    lenis.on("scroll", () => {
      if (window.ScrollTrigger) ScrollTrigger.update();
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Internal-link smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      });
    });
  }


  /* ---------------------------------------------------------
     3. GSAP registration + initial hides for ENTRANCE only
        (descent headlines remain hidden until scroll — see Act III)
     --------------------------------------------------------- */
  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance: hide these at script parse so there's no flash before
  // the entrance animation plays on DOMContentLoaded.
  // (lotus-photo uses xPercent/yPercent to preserve the CSS absolute-centering
  //  translate(-50%, -50%) when GSAP later animates its scale.)
  gsap.set(".lotus", { scale: 0.94, opacity: 0 });
  gsap.set(".lotus-photo", { xPercent: -50, yPercent: -50, scale: 0.94, opacity: 0 });
  gsap.set(".lotus-bloom-glow", { opacity: 0, scale: 0.7 });
  gsap.set(".side-caption", { opacity: 0 });
  gsap.set(".eyebrow", { y: 14, opacity: 0 });
  gsap.set(".hero-headline .word-inner", { yPercent: 110 });
  gsap.set(".hero-mark", { y: 10, opacity: 0 });
  gsap.set(".hero-sub .sub-line", { y: 14, opacity: 0 });
  gsap.set(".hero-cta .btn-primary, .hero-cta .btn-ghost", { y: 20, opacity: 0 });
  gsap.set(".scroll-cue", { opacity: 0 });

  // Descent words stay hidden until the descent pinned timeline runs
  gsap.set(".descent-h .word-inner", { yPercent: 110 });

  // Lotus is fully bloomed at rest — entrance adds a subtle scale-in only.
  setLotusState(1);


  /* ---------------------------------------------------------
     4. ACT I — BLOOM
        Architecture: one-time entrance on load + pinned-scrub
        EXIT timeline that drifts content out as user scrolls
        toward Act II. The hero is FULLY VISIBLE at rest.
     --------------------------------------------------------- */
  let bloomTL = null;
  let bloomEntranceTL = null;
  let bloomLoopsStarted = false;

  function playBloomEntrance() {
    if (bloomEntranceTL) return bloomEntranceTL;

    // .lotus-photo gets its filter pre-set here (module set only sets scale + opacity)
    gsap.set(".lotus-photo", { filter: "blur(8px)" });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      delay: 0.15,
    });

    tl
      // Lotus + glow ignite first
      .to(".lotus",            { scale: 1, opacity: 1, duration: 1.4, ease: "expo.out" }, 0)
      .to(".lotus-photo",      { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.4, ease: "expo.out" }, 0)
      .to(".lotus-bloom-glow", { opacity: 0.85, scale: 1.1, duration: 1.6, ease: "expo.out" }, 0)
      // Side captions arrive while lotus is still settling
      .to(".side-caption",     { opacity: 1, duration: 0.9, ease: "power2.out" }, 0.35)
      // Hero copy in a confident cascade
      .to(".eyebrow",          { y: 0, opacity: 1, duration: 0.7 }, 0.55)
      .to(".hero-headline .line:nth-child(1) .word-inner",
                                { yPercent: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.7)
      .to(".hero-headline .line:nth-child(2) .word-inner",
                                { yPercent: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.85)
      .to(".hero-mark",         { y: 0, opacity: 1, duration: 0.8 }, 1.15)
      .to(".hero-sub .sub-line",
                                { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 }, 1.45)
      .to(".hero-cta .btn-primary, .hero-cta .btn-ghost",
                                { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 }, 1.7)
      .to(".scroll-cue",       { opacity: 1, duration: 0.6 }, 2.1);

    // Start the breath + glow loops only after the entrance settles —
    // otherwise GSAP's auto-overwrite would kill them when the entrance
    // takes over scale/opacity on the same elements.
    tl.call(() => {
      gsap.to(".lotus, .lotus-photo", {
        scale: "+=0.015",
        duration: 6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".lotus-bloom-glow", {
        scale: 1.15,
        duration: 6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });

    bloomEntranceTL = tl;
    return tl;
  }

  function buildBloomExit() {
    const stage = $(".act-bloom");
    if (!stage) return null;

    // No pin — the section scrolls away naturally, the exit timeline scrubs
    // the fade as it leaves the viewport. Simpler and avoids any race with
    // the auto-play entrance animation.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: "bottom top",
        scrub: 1.2,
      },
    });

    tl
      .to(".scroll-cue",       { opacity: 0, y: 14, duration: 0.25 }, 0)
      .to(".hero-content",     { y: -120, opacity: 0, scale: 0.94, duration: 1.0 }, 0)
      .to(".lotus-wrap",       { y: -60, scale: 1.08, opacity: 0.4, duration: 1.0 }, 0)
      .to(".side-caption",     { opacity: 0, duration: 0.45 }, 0)
      .to(".lotus-bloom-glow", { opacity: 0.2, duration: 1.0 }, 0)
      .to(".atmosphere",       { opacity: 0.5, duration: 1.0 }, 0);

    return tl;
  }

  function buildBloomAct() {
    const stage = $(".act-bloom");
    if (!stage) return;

    if (prefersReducedMotion) {
      setLotusState(1);
      gsap.set(".side-caption, .hero-mark, .hero-sub .sub-line, .hero-cta .btn-primary, .hero-cta .btn-ghost, .eyebrow, .scroll-cue",
               { opacity: 1, y: 0 });
      gsap.set(".hero-headline .word-inner", { yPercent: 0 });
      gsap.set(".lotus, .lotus-photo", { scale: 1, opacity: 1 });
      gsap.set(".lotus-bloom-glow", { opacity: 0.85, scale: 1.1 });
      return;
    }

    // Hero entrance is NOT auto-played here — it's triggered from inside
    // runSplash() so it overlaps with the splash exhale, producing a
    // single continuous bloom-from-splash-into-hero transition.
    bloomTL = buildBloomExit();

    if (bloomLoopsStarted) return;
    bloomLoopsStarted = true;

    // Aura drift loops start now — they don't fight with the entrance.
    // (Lotus + glow breath loops are started by playBloomEntrance's onComplete.)
    gsap.to(".aura-1", { xPercent: 6, yPercent: -4, duration: 18, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to(".aura-2", { xPercent: -8, yPercent: 6, duration: 22, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to(".aura-3", { xPercent: 4, yPercent: -6, duration: 26, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }


  /* ---------------------------------------------------------
     5. ACT II — THE WEIGHT (horizontal track in pin)
     --------------------------------------------------------- */
  function buildWeightAct() {
    const section = $(".act-weight");
    const track = $(".weight-track");
    if (!section || !track) return;

    if (prefersReducedMotion) {
      track.style.flexWrap = "wrap";
      track.style.gap = "40px";
      return;
    }

    // Distance to scroll horizontally
    const getScrollDistance = () => track.scrollWidth - window.innerWidth + 0;

    const trackTween = gsap.to(track, {
      x: () => -getScrollDistance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".weight-track-wrap",
        start: "top top",
        end: () => `+=${getScrollDistance() + window.innerHeight * 0.6}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    // Vignette inner parallax (foreground rises gently while in view).
    // Use the tween directly as containerAnimation — looking it up via
    // ScrollTrigger.getAll() races the lazy trigger-resolve and lands
    // undefined, which then crashes ScrollTrigger.init.
    $$(".vignette-fg").forEach((el) => {
      gsap.fromTo(el,
        { y: 60 },
        {
          y: -30,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest(".vignette"),
            containerAnimation: trackTween,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        }
      );
    });
  }


  /* ---------------------------------------------------------
     6. ACT III — THE DESCENT (theme flip + line-lotus draw)
     --------------------------------------------------------- */
  let descentTL = null;

  function buildDescentTimeline() {
    const section = $(".act-descent");
    if (!section) return null;

    // Re-baseline word transforms (in case headlines were swapped)
    gsap.set(".descent-h .word-inner", { yPercent: 110 });

    // Pinned timeline: line-lotus draws, italic hold copy reveals
    const paths = $$(".ll-ring path, .ll-core, .ll-core-2, .ll-halo");
    paths.forEach((p) => {
      try {
        const len = p.getTotalLength ? p.getTotalLength() : 600;
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.dataset.len = len;
      } catch (e) { /* getTotalLength may fail on some browsers for circles in old versions */ }
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=120%",
        pin: true,
        scrub: 1.2,
        anticipatePin: 1,
      },
    });

    tl.to(".star", { opacity: 1, duration: 0.3, stagger: 0.03, ease: "power2.out" }, 0)
      .to(paths, {
        strokeDashoffset: 0,
        duration: 0.7,
        stagger: { each: 0.02, from: "random" },
        ease: "power2.out",
      }, 0.05)
      .to(".descent-eyebrow", { opacity: 1, duration: 0.2 }, 0.4)
      .to(".descent-h .line:nth-child(1) .word-inner",
          { yPercent: 0, duration: 0.25, stagger: 0.04, ease: "expo.out" }, 0.45)
      .to(".descent-h .line:nth-child(2) .word-inner",
          { yPercent: 0, duration: 0.25, stagger: 0.04, ease: "expo.out" }, 0.55)
      .to(".descent-h .line:nth-child(3) .word-inner",
          { yPercent: 0, duration: 0.28, stagger: 0.05, ease: "expo.out" }, 0.65)
      .to(".descent-h .line:nth-child(4) .word-inner",
          { yPercent: 0, duration: 0.28, stagger: 0.05, ease: "expo.out" }, 0.72)
      .from(".descent-sub", { y: 30, opacity: 0, duration: 0.3, ease: "power2.out" }, 0.85)
      .to(".line-lotus", { scale: 0.94, opacity: 0.92, duration: 0.3 }, 0.85);

    return tl;
  }

  /* ──────────────────────────────────────────────────────────────
     INTERLUDE — THE SOFT HOUR
     A wordless bridge between Act II (Weight) and Act III (Quiet
     Hour). The watercolor paints in via a radial mask whose radius
     grows with scroll progress. Sets a CSS custom property
     --reveal: 0 → 1 on the .interlude.soft-hour element, which
     the mask in styles.css consumes.
     ────────────────────────────────────────────────────────────── */
  function buildSoftHourInterlude() {
    const stage = $(".interlude.soft-hour");
    if (!stage) return;
    const wrap = stage.querySelector(".soft-hour-portrait-wrap");
    const line = stage.querySelector(".soft-hour-line");
    if (!wrap || !line) return;

    if (prefersReducedMotion) {
      stage.style.setProperty("--reveal", "1");
      gsap.set([wrap, line], { opacity: 1, y: 0 });
      return;
    }

    gsap.set(wrap, { opacity: 0, y: 24 });
    gsap.set(line, { opacity: 0, y: 18 });
    stage.style.setProperty("--reveal", "0");

    // Paint-in: tied to scroll progress through the interlude.
    // The mask grows as user scrolls from "top 80%" to "center 45%".
    gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: "top 80%",
        end: "center 45%",
        scrub: 1.2,
        onUpdate: (self) => {
          stage.style.setProperty("--reveal", self.progress.toFixed(3));
        },
      },
    })
      .to(wrap, { opacity: 1, y: 0, duration: 1, ease: "none" }, 0)
      .to(line, { opacity: 1, y: 0, duration: 0.8, ease: "none" }, 0.45);
  }

  function buildDescentAct() {
    const section = $(".act-descent");
    if (!section) return;

    // Color theme flip — animate body bg / text via class
    ScrollTrigger.create({
      trigger: section,
      start: "top 60%",
      end: "bottom 40%",
      onEnter:      () => document.body.classList.add("theme-night"),
      onEnterBack:  () => document.body.classList.add("theme-night"),
      onLeave:      () => document.body.classList.remove("theme-night"),
      onLeaveBack:  () => document.body.classList.remove("theme-night"),
    });

    // Body background tween (cream <-> midnight)
    ScrollTrigger.create({
      trigger: section,
      start: "top 80%",
      end: "top 20%",
      scrub: 1.2,
      onUpdate: (st) => {
        const t = st.progress;
        const r = Math.round(241 + (26 - 241) * t);   // #F1 -> #1A
        const g = Math.round(232 + (14 - 232) * t);   // #E8 -> #0E
        const b = Math.round(220 + (20 - 220) * t);   // #DC -> #14
        document.documentElement.style.setProperty("--body-bg", `rgb(${r}, ${g}, ${b})`);
        document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      },
    });
    ScrollTrigger.create({
      trigger: section,
      start: "bottom 70%",
      end: "bottom 20%",
      scrub: 1.2,
      onUpdate: (st) => {
        const t = st.progress;
        const r = Math.round(26 + (241 - 26) * t);
        const g = Math.round(14 + (232 - 14) * t);
        const b = Math.round(20 + (220 - 20) * t);
        document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      },
    });

    if (prefersReducedMotion) {
      gsap.set(".descent-h .word-inner", { yPercent: 0 });
      gsap.set(".star", { opacity: 0.9 });
      return;
    }

    descentTL = buildDescentTimeline();

    // Twinkle loop on stars
    $$(".star").forEach((s, i) => {
      gsap.to(s, {
        opacity: 0.35,
        duration: 1.6 + (i % 5) * 0.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: (i % 7) * 0.3,
      });
    });
  }


  /* ---------------------------------------------------------
     6b. NIGHT CANVAS — raw WebGL particle field for Descent.
          ~220 gold-dust particles with depth-varying point sprites,
          mouse-parallax warp, additive blending, gaussian alpha.
     --------------------------------------------------------- */
  function buildNightCanvas() {
    const canvas = document.querySelector(".night-canvas");
    if (!canvas) return;
    if (prefersReducedMotion) return;
    if (canvas.dataset.glReady) return;

    let gl = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        preserveDrawingBuffer: false,
      }) || canvas.getContext("experimental-webgl");
    } catch (e) { /* unsupported */ }
    if (!gl) return; // CSS-star fallback stays visible

    canvas.dataset.glReady = "1";
    document.body.classList.add("has-webgl");

    // --- shaders ---
    const vsSrc = `
      precision mediump float;
      attribute vec2  aOrigin;
      attribute float aSeed;
      attribute float aSize;
      attribute float aDepth;
      uniform   float uTime;
      uniform   vec2  uMouse;
      uniform   vec2  uResolution;
      varying   float vDepth;
      varying   float vSeed;
      void main() {
        vec2 p = aOrigin;
        // gentle sinusoidal drift (dust suspended in a beam of light)
        p.x += sin(uTime * (0.10 + aSeed * 0.20) + aSeed * 12.0) * 0.040;
        p.y += cos(uTime * (0.08 + aSeed * 0.14) + aSeed *  8.0) * 0.035;
        // slow downward bias on near particles
        p.y += mod(uTime * (0.004 + aSeed * 0.010), 1.0) * (0.04 * aDepth);
        // mouse parallax (closer particles move more)
        p += uMouse * 0.025 * aDepth;
        // wrap so particles never leave the field
        p = fract(p);
        // -> clip space
        vec2 clip = p * 2.0 - 1.0;
        clip.y *= -1.0;
        gl_Position = vec4(clip, 0.0, 1.0);
        gl_PointSize = aSize * (0.5 + aDepth * 2.4) * (uResolution.x / 1200.0);
        vDepth = aDepth;
        vSeed  = aSeed;
      }
    `;
    const fsSrc = `
      precision mediump float;
      uniform float uTime;
      varying float vDepth;
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        // soft gaussian
        float alpha = smoothstep(0.5, 0.0, d);
        alpha = pow(alpha, 1.4);
        // gold / ivory mix — center is hottest
        vec3 gold  = vec3(0.91, 0.77, 0.57);
        vec3 ivory = vec3(1.00, 0.96, 0.89);
        vec3 col = mix(gold, ivory, alpha);
        // gentle twinkle
        float twinkle = 0.85 + 0.15 * sin(uTime * (0.8 + vSeed * 1.4) + vSeed * 20.0);
        gl_FragColor = vec4(col, alpha * 0.85 * twinkle * (0.5 + 0.5 * vDepth));
      }
    `;

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("night-canvas shader error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("night-canvas link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // --- particles ---
    const N = 220;
    const data = new Float32Array(N * 5);
    for (let i = 0; i < N; i++) {
      const o = i * 5;
      data[o + 0] = Math.random();                  // x
      data[o + 1] = Math.random();                  // y
      data[o + 2] = Math.random();                  // seed
      data[o + 3] = 2 + Math.random() * 6;          // base size
      data[o + 4] = Math.pow(Math.random(), 1.5);   // depth (biased toward back)
    }
    // Sprinkle ~30 brighter "near" particles
    for (let i = 0; i < 30; i++) {
      const o = i * 5;
      data[o + 3] = 6 + Math.random() * 12;
      data[o + 4] = 0.75 + Math.random() * 0.25;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    const FLOAT = 4;
    const stride = 5 * FLOAT;
    const aOrigin = gl.getAttribLocation(prog, "aOrigin");
    const aSeed   = gl.getAttribLocation(prog, "aSeed");
    const aSize   = gl.getAttribLocation(prog, "aSize");
    const aDepth  = gl.getAttribLocation(prog, "aDepth");
    gl.enableVertexAttribArray(aOrigin);
    gl.vertexAttribPointer(aOrigin, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, stride, 2 * FLOAT);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 3 * FLOAT);
    gl.enableVertexAttribArray(aDepth);
    gl.vertexAttribPointer(aDepth, 1, gl.FLOAT, false, stride, 4 * FLOAT);

    const uTime  = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uRes   = gl.getUniformLocation(prog, "uResolution");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive — bokeh feel
    gl.clearColor(0, 0, 0, 0);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Mouse parallax (normalized -1..1, eased)
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    document.addEventListener("mousemove", (e) => {
      tmx = (e.clientX / window.innerWidth)  * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    // Render only while the descent section is anywhere near viewport
    let inView = true;
    const sec = canvas.closest(".act-descent");
    if (sec && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { inView = e.isIntersecting; });
      }, { rootMargin: "60% 0px 60% 0px" });
      io.observe(sec);
    }

    const startMs = performance.now();
    gsap.ticker.add(() => {
      if (!inView) return;
      mx += (tmx - mx) * 0.06;
      my += (tmy - my) * 0.06;
      const t = (performance.now() - startMs) * 0.001;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.POINTS, 0, N);
    });

    requestAnimationFrame(() => canvas.classList.add("is-on"));
  }


  /* ---------------------------------------------------------
     7. ACT IV — THE COMPANION (sticky-step active panel)
     --------------------------------------------------------- */
  function buildCompanionAct() {
    const steps = $$(".step");
    const panels = $$(".cv-panel");
    if (!steps.length || !panels.length) return;

    function setActive(i) {
      panels.forEach((p, j) => p.classList.toggle("is-active", i === j));
    }

    if (prefersReducedMotion) {
      panels.forEach((p) => p.classList.add("is-active"));
      return;
    }

    steps.forEach((step, i) => {
      ScrollTrigger.create({
        trigger: step,
        start: "top 60%",
        end: "bottom 40%",
        onEnter:     () => setActive(i),
        onEnterBack: () => setActive(i),
      });
      // Step text fade-in
      gsap.from(step.querySelectorAll(".step-num, .step-kicker, .step-h, .step-body"), {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: "power3.out",
        scrollTrigger: {
          trigger: step,
          start: "top 75%",
        },
      });
    });
  }


  /* ---------------------------------------------------------
     8. ACT V — WITNESS marquees (3 lanes, varied speeds)
     --------------------------------------------------------- */
  function buildWitnessAct() {
    const lanes = $$(".marquee .marquee-row");
    if (!lanes.length) return;

    // Duplicate inner content to allow seamless wrap
    lanes.forEach((row, i) => {
      const html = row.innerHTML;
      row.innerHTML = html + html;
    });

    if (prefersReducedMotion) return;

    const speeds = [60, 90, 45]; // seconds per loop
    const dirs   = [-1, 1, -1];
    lanes.forEach((row, i) => {
      const dur = speeds[i] || 60;
      const dir = dirs[i] || -1;
      const w = row.scrollWidth / 2;
      gsap.fromTo(
        row,
        { x: dir < 0 ? 0 : -w },
        {
          x: dir < 0 ? -w : 0,
          duration: dur,
          ease: "none",
          repeat: -1,
        }
      );
    });

    // Slow scroll-parallax on the whole stack
    gsap.to(".marquee-stack", {
      yPercent: -8,
      ease: "none",
      scrollTrigger: {
        trigger: ".act-witness",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  }


  /* ---------------------------------------------------------
     9. ACT VI — OPEN HAND reveals + Act VII coda reveals
     --------------------------------------------------------- */
  function buildOpenAct() {
    $$(".reveal-up").forEach((el) => {
      gsap.fromTo(el,
        { y: 28, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        }
      );
    });

    // Coda heading reveal
    if (!prefersReducedMotion) {
      gsap.from(".coda-h", {
        y: 40, opacity: 0, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: ".act-coda", start: "top 70%" },
      });
      gsap.from(".coda-sub", {
        y: 20, opacity: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: ".coda-sub", start: "top 85%" },
        delay: 0.15,
      });
      gsap.from(".waitlist-form .field, .btn-submit, .form-privacy", {
        y: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: ".waitlist-form", start: "top 80%" },
      });
      gsap.from(".coda-mark", {
        scale: 0.5, opacity: 0, rotation: -30, duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: ".act-coda", start: "top 75%" },
      });
    }
  }


  /* ---------------------------------------------------------
     10. PETAL FIELD — persistent fixed-overlay petal drift
     --------------------------------------------------------- */
  function startPetalField() {
    if (prefersReducedMotion) return;
    const petals = $$(".petal-field .drift");
    petals.forEach((p, i) => {
      const dur   = 14 + (i % 4) * 2.6;
      const delay = i * 1.8;
      const swayX = 30 + (i % 3) * 15;
      const rot   = 30 + (i % 4) * 12;

      const tl = gsap.timeline({ repeat: -1, delay });
      tl.fromTo(p,
        { y: "-10vh", x: 0, rotation: 0, opacity: 0 },
        {
          y: "110vh",
          x: ((i % 2 === 0) ? swayX : -swayX),
          rotation: ((i % 2 === 0) ? rot : -rot),
          opacity: 1,
          duration: dur,
          ease: "none",
          onUpdate: function () {
            const t = this.progress();
            const fade =
              t < 0.15 ? gsap.utils.mapRange(0, 0.15, 0, 0.85, t) :
              t > 0.85 ? gsap.utils.mapRange(0.85, 1, 0.85, 0, t) :
              0.85;
            p.style.opacity = fade.toFixed(3);
          },
        }
      );
    });
  }


  /* ---------------------------------------------------------
     11. PARALLAX — data-speed for any element
     --------------------------------------------------------- */
  function buildParallax() {
    if (prefersReducedMotion) return;
    $$("[data-speed]").forEach((el) => {
      const speed = parseFloat(el.dataset.speed);
      if (isNaN(speed) || speed === 1) return;
      // Negative -> moves slower (background), positive -> faster (foreground)
      const distance = (1 - speed) * 100;
      gsap.fromTo(el,
        { yPercent: -distance / 2 },
        {
          yPercent: distance / 2,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest("section") || el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });
  }


  /* ---------------------------------------------------------
     12. ACT MARKER — chapter ticker (language-aware)
     --------------------------------------------------------- */
  let currentMarkerSec = null;

  function actTitleFor(sec) {
    const isAR = document.body.classList.contains("lang-ar");
    if (isAR && sec.dataset.actTitleAr) return sec.dataset.actTitleAr;
    return sec.dataset.actTitle || "";
  }

  function buildActMarker() {
    const marker = $(".act-marker");
    if (!marker) return;
    const numEl   = marker.querySelector(".act-marker-num");
    const titleEl = marker.querySelector(".act-marker-title");
    const fillEl  = marker.querySelector(".act-marker-fill");

    const sections = $$(".act");
    sections.forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: "top 60%",
        end:   "bottom 40%",
        onEnter:     () => updateMarker(sec),
        onEnterBack: () => updateMarker(sec),
      });
      ScrollTrigger.create({
        trigger: sec,
        start: "top top",
        end: "bottom top",
        scrub: 0.3,
        onUpdate: (st) => {
          if (currentMarkerSec === sec) {
            fillEl.style.width = (st.progress * 100).toFixed(1) + "%";
          }
        },
      });
    });

    function updateMarker(sec) {
      currentMarkerSec = sec;
      const num = sec.dataset.act || "";
      const title = actTitleFor(sec);
      if (numEl.textContent !== num || titleEl.textContent !== title) {
        numEl.style.transition = "opacity 250ms ease";
        numEl.style.opacity = 0;
        titleEl.style.opacity = 0;
        setTimeout(() => {
          numEl.textContent = num;
          titleEl.textContent = title;
          numEl.style.opacity = 1;
          titleEl.style.opacity = 1;
        }, 200);
      }
    }
  }

  // Expose so applyLanguage can re-trigger the marker after a swap
  function refreshActMarker() {
    if (currentMarkerSec) {
      const title = actTitleFor(currentMarkerSec);
      const titleEl = $(".act-marker .act-marker-title");
      if (titleEl) titleEl.textContent = title;
    }
  }


  /* ---------------------------------------------------------
     13. HEADER scroll state
     --------------------------------------------------------- */
  function buildHeader() {
    const header = $(".header");
    if (!header) return;
    ScrollTrigger.create({
      start: "top -80",
      onUpdate: (st) => {
        header.classList.toggle("is-scrolled", st.direction !== 0 || window.scrollY > 80);
        if (window.scrollY > 80) header.classList.add("is-scrolled");
        else header.classList.remove("is-scrolled");
      },
    });
    window.addEventListener("scroll", () => {
      header.classList.toggle("is-scrolled", window.scrollY > 80);
    }, { passive: true });
  }


  /* ---------------------------------------------------------
     14. CURSOR halo
     --------------------------------------------------------- */
  function buildCursor() {
    if (prefersReducedMotion) return;
    if (matchMedia("(pointer: coarse)").matches) return; // skip on touch
    const halo = $(".cursor-halo");
    if (!halo) return;
    document.body.classList.add("is-cursor");
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x, ty = y;
    document.addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
    }, { passive: true });
    gsap.ticker.add(() => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      halo.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }


  /* ---------------------------------------------------------
     15. WAITLIST form (keeps original gentle behavior)
     --------------------------------------------------------- */
  function buildForm() {
    const forms = $$(".waitlist-form, .contact-form");
    if (!forms.length) return;

    function showConfirmation(form) {
      const confirm = form.querySelector(".form-confirm");
      const privacy = form.querySelector(".form-privacy");
      const submit  = form.querySelector(".btn-submit");
      const fields  = form.querySelectorAll(".field, .field-area");
      const targets = [...fields, submit, privacy].filter(Boolean);

      if (typeof gsap === "undefined") {
        targets.forEach((el) => el.style.display = "none");
        if (confirm) confirm.hidden = false;
        return;
      }
      gsap.to(targets, {
        y: -8, opacity: 0, duration: 0.5, stagger: 0.04, ease: "power2.in",
        onComplete: () => {
          targets.forEach((el) => el.style.display = "none");
          if (confirm) {
            confirm.hidden = false;
            gsap.fromTo(confirm, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
          }
        },
      });
    }

    async function postToEndpoint(form) {
      const endpoint = form.getAttribute("action") || form.dataset.endpoint;
      if (!endpoint || endpoint === "#" || endpoint.includes("YOUR_")) return; // not configured yet
      const data = new FormData(form);
      try {
        await fetch(endpoint, {
          method: "POST",
          body: data,
          // Mailchimp / ConvertKit standard forms work cross-origin
          // with `no-cors` — we can't read the response, but the
          // submission succeeds. For a JSON API, switch to `cors`
          // mode and add `Accept: application/json` headers.
          mode: "no-cors",
        });
      } catch (err) {
        // Even if the network request fails, show confirmation —
        // the brand voice is "we'll write to you when ready", not
        // "your submission failed". Log silently for ops.
        console.warn("[mAmI] form submit network error:", err);
      }
    }

    forms.forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        postToEndpoint(form);
        showConfirmation(form);
      });
    });
  }


  /* ---------------------------------------------------------
     16. LANGUAGE — full EN / AR (RTL) toggle
     --------------------------------------------------------- */

  // AR-specific headline structures (split into words for the rise-tween).
  // Each line is its own block so the existing GSAP word-inner targets it.
  const AR_HEADLINES = {
    ".hero-headline": `
      <span class="line"><span class="word"><span class="word-inner">لكلّ</span></span> <span class="word"><span class="word-inner">ما</span></span></span>
      <span class="line"><span class="word"><span class="word-inner">تحملينَه</span></span><span class="word"><span class="word-inner"><em>.</em></span></span></span>
    `,
    ".descent-h": `
      <span class="line"><span class="word"><span class="word-inner">لستِ</span></span></span>
      <span class="line"><span class="word"><span class="word-inner">تتفكّكين.</span></span></span>
      <span class="line"><span class="word"><span class="word-inner"><em>أنتِ</em></span></span> <span class="word"><span class="word-inner"><em>تتفتّحينَ</em></span></span></span>
      <span class="line"><span class="word"><span class="word-inner"><em>تحتَ</em></span></span> <span class="word"><span class="word-inner"><em>الضغط.</em></span></span></span>
    `,
  };

  // Cache original EN markup for headlines (populated lazily on first swap)
  const EN_HEADLINES_CACHE = {};

  function applyLanguage(lang) {
    const html = document.documentElement;
    const body = document.body;
    const isAR = lang === "ar";

    html.lang = isAR ? "ar" : "en";
    html.dir  = isAR ? "rtl" : "ltr";
    body.classList.toggle("lang-ar", isAR);
    body.classList.toggle("lang-en", !isAR);

    // Swap text on all [data-ar] elements
    $$("[data-ar]").forEach((el) => {
      if (!el.dataset.en) el.dataset.en = el.textContent;
      el.textContent = isAR ? el.dataset.ar : el.dataset.en;
    });

    // Swap HTML on [data-ar-html] elements (preserves <em> etc.)
    $$("[data-ar-html]").forEach((el) => {
      if (!el.dataset.enHtml) el.dataset.enHtml = el.innerHTML;
      el.innerHTML = isAR ? el.dataset.arHtml : el.dataset.enHtml;
    });

    // Swap placeholders
    $$("[data-ar-placeholder]").forEach((el) => {
      if (!el.dataset.enPlaceholder) el.dataset.enPlaceholder = el.getAttribute("placeholder") || "";
      el.setAttribute("placeholder", isAR ? el.dataset.arPlaceholder : el.dataset.enPlaceholder);
    });

    // Swap aria-labels
    $$("[data-ar-aria-label]").forEach((el) => {
      if (!el.dataset.enAriaLabel) el.dataset.enAriaLabel = el.getAttribute("aria-label") || "";
      el.setAttribute("aria-label", isAR ? el.dataset.arAriaLabel : el.dataset.enAriaLabel);
    });

    // Update the "Act" label
    const ml = $(".act-marker-label");
    if (ml) {
      if (!ml.dataset.en) ml.dataset.en = ml.textContent;
      ml.textContent = isAR ? "فصل" : ml.dataset.en;
    }
    // Refresh marker title — if no scroll has happened yet, fall back to
    // the first section the user is over right now.
    if (!currentMarkerSec) {
      const mid = window.innerHeight / 2;
      const allSecs = $$(".act");
      for (const s of allSecs) {
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) { currentMarkerSec = s; break; }
      }
      if (!currentMarkerSec) currentMarkerSec = allSecs[0];
    }
    refreshActMarker();

    // Swap headlines, then immediately hide new word-inners so the
    // pinned-timeline rebuild can lift them back up without a flash.
    Object.entries(AR_HEADLINES).forEach(([sel, arHtml]) => {
      const el = $(sel);
      if (!el) return;
      if (!EN_HEADLINES_CACHE[sel]) EN_HEADLINES_CACHE[sel] = el.innerHTML;
      el.innerHTML = isAR ? arHtml : EN_HEADLINES_CACHE[sel];
      if (!prefersReducedMotion) {
        gsap.set(el.querySelectorAll(".word-inner"), { yPercent: 110 });
      }
    });

    // The hero exit timeline targets containers (.hero-content, .lotus-wrap,
    // .side-caption) — none of which get swapped — so it survives a language
    // toggle as-is. Only the descent timeline holds per-word references that
    // get orphaned by the headline innerHTML swap, so rebuild it.
    if (descentTL) {
      const st = descentTL.scrollTrigger;
      if (st) st.kill(true);
      descentTL.kill();
      descentTL = buildDescentTimeline();
    }

    // Re-measure after font/layout swap
    if (window.ScrollTrigger) {
      setTimeout(() => ScrollTrigger.refresh(), 50);
    }

    // Persist
    try { localStorage.setItem("mami.lang", isAR ? "ar" : "en"); } catch (_) {}
  }

  function buildLang() {
    // Restore previously chosen language synchronously, BEFORE the act
    // timelines are built (so they target the right DOM).
    let saved = "en";
    try { saved = localStorage.getItem("mami.lang") || "en"; } catch (_) {}
    applyLanguage(saved);

    // Sync the toggle button visual state to whichever language is active
    const initialAR = saved === "ar";
    $$(".lang").forEach((g) => {
      g.querySelectorAll(".lang-btn").forEach((b) => {
        const bIsAr = b.getAttribute("lang") === "ar";
        b.classList.toggle("is-active", bIsAr === initialAR);
        b.setAttribute("aria-pressed", bIsAr === initialAR ? "true" : "false");
      });
    });

    $$(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const isAR = btn.getAttribute("lang") === "ar";
        $$(".lang").forEach((g) => {
          g.querySelectorAll(".lang-btn").forEach((b) => {
            const bIsAr = b.getAttribute("lang") === "ar";
            b.classList.toggle("is-active", bIsAr === isAR);
            b.setAttribute("aria-pressed", bIsAr === isAR ? "true" : "false");
          });
        });
        applyLanguage(isAR ? "ar" : "en");
      });
    });
  }


  /* ---------------------------------------------------------
     16b. SPLASH — opening sequence (First Breath)
          Matches bloom-hero motion language exactly:
            · same gradient + auras as .act-bloom
            · same line-lotus stroke-draw as Act III
            · same blur+scale+y bloom-in as the lotus photo
            · same word-inner rise + expo.out as .hero-headline
            · same eases (power2.out / power3.out / expo.out / sine.inOut)
     --------------------------------------------------------- */
  function runSplash() {
    const splash = $(".splash");
    if (!splash) {
      document.body.classList.remove("splash-locked");
      return Promise.resolve();
    }

    let alreadySplashed = false;
    try { alreadySplashed = sessionStorage.getItem("mami.splashed") === "1"; } catch (_) {}

    const finish = (resolve) => {
      document.body.classList.remove("splash-locked");
      document.body.classList.add("splash-done");
      try { sessionStorage.setItem("mami.splashed", "1"); } catch (_) {}
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      resolve();
    };

    // Reduced motion — gentle fade only, no choreography
    if (prefersReducedMotion) {
      return new Promise((resolve) => {
        gsap.to(splash, {
          opacity: 0,
          duration: 0.35,
          ease: "power2.out",
          delay: 0.2,
          onComplete: () => finish(resolve),
        });
      });
    }

    // Returning visitor within this tab — minimal splash fade, but still
    // play the hero entrance so the underlying content isn't stuck hidden.
    if (alreadySplashed) {
      return new Promise((resolve) => {
        const tl = gsap.timeline({ onComplete: () => finish(resolve) });
        tl.call(() => playBloomEntrance(), null, 0.05)
          .to(splash, { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.1);
      });
    }

    // Initial rest state — glow + logo + eyebrow held back, ready to bloom
    gsap.set(".splash-glow",    { opacity: 0, scale: 0.6 });
    gsap.set(".splash-logo",    { opacity: 0, scale: 1.06, y: 24, filter: "blur(14px) drop-shadow(0 24px 60px rgba(91, 44, 58, 0.22))" });
    gsap.set(".splash-eyebrow", { opacity: 0, y: 8 });

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => finish(resolve),
      });

      // 0.0 — held breath: glow ignites first (warm halo behind the mark)
      tl.to(".splash-glow", { opacity: 0.9, scale: 1.1, duration: 1.4, ease: "power2.out" }, 0.0)

      // 0.45 — the brand mark itself blooms in:
      //        blur clears, scale settles, y drifts to rest.
      //        (same opacity+scale+y+blur signature as the hero .lotus-photo)
        .to(".splash-logo", {
          opacity: 1, scale: 1, y: 0,
          filter: "blur(0px) drop-shadow(0 24px 60px rgba(91, 44, 58, 0.22))",
          duration: 1.6, ease: "expo.out",
        }, 0.45)

      // 2.0 — eyebrow whispers in below the mark
        .to(".splash-eyebrow", {
          opacity: 0.85, y: 0,
          duration: 0.6, ease: "power3.out",
        }, 2.0)

      // 2.8 — hand-off exhale into the hero
        .to(".splash-glow",       { scale: 1.35, opacity: 0, duration: 0.9, ease: "sine.inOut" }, 2.8)
        .to(".splash-stage",      { y: -16, opacity: 0, filter: "blur(8px)", duration: 0.85, ease: "power2.inOut" }, 2.8)
        .to(".splash-atmosphere", { opacity: 0, duration: 0.85, ease: "sine.inOut" }, 2.9)
        // Kick off the hero entrance underneath, mid-exhale, so the two
        // blooms cross-fade into one continuous reveal.
        .call(() => playBloomEntrance(), null, 2.95)
        .to(".splash",            { opacity: 0, duration: 0.55, ease: "power2.inOut" }, 3.35);

      // Skip-ahead: click or any keypress fast-forwards to the exhale
      const skip = () => {
        if (tl.progress() < 0.72) {
          gsap.to(tl, { progress: 0.72, duration: 0.35, ease: "power2.out" });
        }
      };
      splash.addEventListener("click", skip, { passive: true });
      window.addEventListener("keydown", skip, { once: true });
    });
  }


  /* ---------------------------------------------------------
     17. Font-ready refresh — text metrics settle after WOFF
     --------------------------------------------------------- */
  function fontsReadyRefresh() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }
    window.addEventListener("resize", () => ScrollTrigger.refresh(), { passive: true });
  }


  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     18. HAMBURGER + MOBILE DRAWER (cross-page chrome)
     --------------------------------------------------------- */
  function buildMobileMenu() {
    const btn = $(".menu-btn");
    const drawer = $("#mobile-drawer");
    if (!btn || !drawer) return;

    function open() {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
    }
    function close() {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
    btn.addEventListener("click", () => {
      btn.getAttribute("aria-expanded") === "true" ? close() : open();
    });
    drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") close();
    });
  }


  /* ---------------------------------------------------------
     18b. SUBPAGE CINEMATIC MOTION
          Parallax bg auras + hero scroll-out + feature-row
          alternating slide-in + section child stagger +
          CTA scale-pop + contact form field stagger.
          Runs BEFORE buildFadeUps so it can claim elements
          (by removing .fade-up so they don't double-animate).
     --------------------------------------------------------- */
  function buildSubpageMotion() {
    if (prefersReducedMotion) return;
    if (typeof gsap === "undefined" || !window.ScrollTrigger) return;

    const claim = (el) => { el.classList.remove("fade-up"); el.classList.add("is-in"); };

    // 1) Parallax background auras drift opposite directions
    $$(".page-bg .aura").forEach((el, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      gsap.fromTo(el,
        { yPercent: -25 * dir },
        {
          yPercent: 25 * dir,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest(".page") || document.body,
            start: "top top",
            end: "bottom top",
            scrub: 1.2,
          },
        }
      );
    });

    // 2) Page-hero — soft entrance, then drift up + fade as user scrolls past.
    // The scrub uses fromTo with explicit start values + immediateRender:false
    // so it doesn't capture the entrance's from-state (opacity:0) as its
    // own start — that previously caused the hero to vanish whenever the
    // user scrolled past and came back to scroll position 0.
    $$(".page-hero").forEach((hero) => {
      claim(hero);
      gsap.from(hero, { y: 30, opacity: 0, duration: 1.0, ease: "power3.out" });
      gsap.fromTo(hero,
        { y: 0, opacity: 1 },
        {
          y: -60, opacity: 0.5,
          ease: "none",
          immediateRender: false,
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 1.2,
          },
        }
      );
    });

    // 3) Feature rows — alternating slide-in + subtle parallax on the visual
    $$(".feature-row").forEach((row, i) => {
      claim(row);
      const fromLeft = i % 2 === 0;
      const text   = row.querySelector(".feature-row-text");
      const visual = row.querySelector(".feature-row-visual");
      if (text) {
        gsap.from(text, {
          x: fromLeft ? -50 : 50, opacity: 0,
          duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: row, start: "top 78%" },
        });
      }
      if (visual) {
        gsap.from(visual, {
          x: fromLeft ? 50 : -50, opacity: 0, scale: 0.94,
          duration: 1.0, ease: "power3.out",
          scrollTrigger: { trigger: row, start: "top 78%" },
        });
        gsap.to(visual, {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: row,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      }
    });

    // 4) Page-sections — stagger children for a richer reveal than basic fade-up
    $$(".page-section").forEach((sec) => {
      claim(sec);
      const kids = [
        ...sec.querySelectorAll(":scope > .page-section-h"),
        ...sec.querySelectorAll(":scope > .page-section-body > p"),
        ...sec.querySelectorAll(":scope > .age-pill"),
        ...sec.querySelectorAll(":scope > .not-grid > div"),
        ...sec.querySelectorAll(":scope > .page-cta-reassure"),
      ];
      if (!kids.length) return;
      gsap.from(kids, {
        y: 28, opacity: 0,
        duration: 0.8, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sec, start: "top 80%" },
      });
    });

    // 5) CTA blocks — gentle scale-pop entrance
    $$(".page-cta").forEach((cta) => {
      claim(cta);
      gsap.from(cta, {
        y: 36, opacity: 0, scale: 0.97,
        duration: 1.0, ease: "power3.out",
        scrollTrigger: { trigger: cta, start: "top 85%" },
      });
    });

    // 6) Contact form — claim & stagger fields
    const contactForm = $(".contact-form");
    if (contactForm) {
      claim(contactForm);
      const items = contactForm.querySelectorAll(".field-area, .field, .btn-submit, .form-privacy");
      gsap.from(items, {
        y: 28, opacity: 0,
        duration: 0.7, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: contactForm, start: "top 78%" },
      });
    }

    // 7) Coming-soon hero (blog, 404) — gentle scale-in for the lotus mark
    $$(".coming-soon-mark").forEach((mark) => {
      gsap.from(mark, {
        scale: 0.6, opacity: 0, rotation: -20,
        duration: 1.4, ease: "expo.out",
      });
    });

    // 9) Legal pages — stagger h2 headings as user scrolls through
    if ($(".legal")) {
      $$(".legal h2").forEach((h) => {
        gsap.from(h, {
          y: 20, opacity: 0,
          duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: h, start: "top 88%" },
        });
      });
    }
  }


  /* ---------------------------------------------------------
     19. SUBPAGE FADE-UP — IntersectionObserver reveal
         Fallback for any .fade-up elements not claimed by
         buildSubpageMotion above.
     --------------------------------------------------------- */
  function buildFadeUps() {
    const items = $$(".fade-up");
    if (!items.length) return;
    if (prefersReducedMotion) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    items.forEach((el) => io.observe(el));
  }


  /* ---------------------------------------------------------
     20. COOKIE CONSENT — gentle, non-intrusive
     --------------------------------------------------------- */
  function buildCookieBanner() {
    const banner = $(".cookie-banner");
    if (!banner) return;
    let accepted = false;
    try { accepted = localStorage.getItem("mami.cookies") === "ok"; } catch (_) {}
    if (accepted) return;
    setTimeout(() => banner.classList.add("is-in"), 1200);
    banner.querySelector("button")?.addEventListener("click", () => {
      try { localStorage.setItem("mami.cookies", "ok"); } catch (_) {}
      banner.classList.remove("is-in");
      setTimeout(() => banner.remove(), 600);
      // Tell analytics.js that consent has been granted so it can
      // now safely inject GA4/Meta/TikTok scripts (it waits for this
      // event before firing any pixel).
      window.dispatchEvent(new Event("mami:cookies-accepted"));
    });
  }


  document.addEventListener("DOMContentLoaded", () => {
    // Detect page type — only Home runs the cinematic init path
    const isHome = !!$(".act-bloom");
    if (!isHome) document.body.classList.add("is-subpage");

    // Restore language FIRST so headlines + copy are in the right script
    // before any pinned/scrub timeline measures them. Also swaps the
    // splash eyebrow text if AR was previously chosen.
    buildLang();

    // Cross-page chrome — runs on every page
    buildHeader();
    buildForm();
    buildMobileMenu();
    buildCookieBanner();

    if (!isHome) {
      // Subpages get cinematic scroll motion (parallax bg, hero drift,
      // feature-row slide-in, section stagger, CTA scale-pop) — runs
      // BEFORE buildFadeUps so it can claim elements first. Anything
      // not claimed falls back to the simple .fade-up reveal.
      buildSubpageMotion();
      buildFadeUps();
      fontsReadyRefresh();
      return;
    }

    // ─── HOME ───
    buildFadeUps(); // Catches any straggler .fade-up elements on Home

    // ─── HOME ONLY ─────────────────────────────────────────────
    // Pause smooth scroll while the splash is up, so wheel/touch input
    // can't slip the hero out from under the opening sequence.
    if (lenis) lenis.stop();

    // Build the hero / acts now — they sit underneath the splash at rest.
    buildBloomAct();
    buildWeightAct();
    buildSoftHourInterlude();
    buildDescentAct();
    buildNightCanvas();
    buildCompanionAct();
    buildWitnessAct();
    buildOpenAct();
    buildParallax();
    buildActMarker();
    buildCursor();
    fontsReadyRefresh();

    // Play the splash, then hand off to the hero. Petal-field drifts
    // are deferred so they never trail across the splash background.
    runSplash().then(() => {
      if (lenis) lenis.start();
      startPetalField();
    });
  });
})();
