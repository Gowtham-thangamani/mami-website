# Hero lotus — replace procedural SVG with photo + petal drift

**Date:** 2026-05-19
**Scope:** Hero section of `index.html` only. No other sections, sections-reveal logic, header, waitlist, or footer changes.

## Goal

Replace the existing scroll-driven procedural SVG lotus in the hero with a photographic lotus (cutout PNG) that breathes gently and has a sparse petal-drift overlay. Keep the cinematic feel; shorten the pinned-scroll length.

## Reference

Unsplash `photo-1544165118-ed65c4473a1b` (short ID `2PX8L5zPLwc`, photographer michael joiner). Side-view pink lotus with cream/golden center, originally photographed against a dark green bokeh — bokeh will be removed.

## Decisions (confirmed with user)

1. **Rendering:** Photo + petal overlay animation (not SVG redesign, not hybrid trace).
2. **Scroll:** Short pin — ~1 viewport height (was 2.5).
3. **Background:** Cutout on cream (transparent PNG, no bokeh).
4. **Petals overlay:** Sparse, slow downward drift, 4–6 petals.
5. **Cutout source:** Local Python `rembg`. Fallback: user supplies PNG if install fails on Python 3.14.

## Asset pipeline

1. Download high-res JPG from Unsplash:
   `https://images.unsplash.com/photo-1544165118-ed65c4473a1b?w=1600&q=80&fm=jpg`
   → `assets/lotus-src.jpg` (~150–250 KB)
2. Background removal via `rembg` (ONNX-based, one-time ~80MB model download):
   → `assets/lotus.png` (~300–500 KB, transparent at ~1200 px wide)
3. Petal sprites for the drift overlay: 3 hand-authored inline SVG petal shapes (~40–60 px each), pink → cream radial gradient matching the photo. Reused across 6 drift instances with size/delay variation.

**Risk:** Python 3.14 is brand new (Oct 2025); `rembg` / `onnxruntime` wheels may not be available for 3.14 yet. If `pip install rembg` fails, halt and ask user to supply `assets/lotus.png` (e.g. via Photoroom web). Do not attempt source builds or version downgrades.

## HTML changes (`index.html`)

Remove the entire `<svg class="lotus" viewBox="0 0 600 600">…</svg>` block including `<defs>`, gradients, ring `<g>` placeholders, and core circles (lines 78–141).

Replace with:

```html
<div class="lotus-wrap" aria-hidden="true">
  <div class="lotus-glow"></div>
  <img class="lotus-photo" src="assets/lotus.png" alt="" width="1200" height="1200" />
  <div class="petal-drift">
    <span class="dpetal dpetal-1"><!-- inline SVG petal --></span>
    <span class="dpetal dpetal-2"><!-- inline SVG petal --></span>
    <span class="dpetal dpetal-3"><!-- inline SVG petal --></span>
    <span class="dpetal dpetal-4"><!-- inline SVG petal --></span>
    <span class="dpetal dpetal-5"><!-- inline SVG petal --></span>
    <span class="dpetal dpetal-6"><!-- inline SVG petal --></span>
  </div>
</div>
```

Keep untouched: `.atmosphere` aura layers, `.side-caption-*`, `.hero-content`, `.scroll-cue`.

## CSS changes (`styles.css`)

**Add:**
- `.lotus-photo` — centered, `max-height: 72vh`, `width: auto`, `filter: drop-shadow(0 30px 70px rgba(141, 90, 108, 0.22))`, `will-change: transform, opacity, filter`.
- `.lotus-glow` — absolute radial gradient bloom behind the photo, replaces the SVG `bg-glow` circle.
- `.petal-drift` — absolute, fills `.lotus-wrap`, `pointer-events: none`, `overflow: hidden`.
- `.dpetal` — absolute, `~48px` default size with per-instance scale variation, pink→cream gradient via inline SVG `<radialGradient>`, varying `left` positions.

**Remove (dead rules):** any selectors targeting `.petal` (old), `.ring-outer`, `.ring-middle`, `.ring-inner`, `.core-glow`, `.core-disc`, `.core-dot`, `.lotus-shadow`, `.bg-glow` (SVG version), and the `--r/--s/--o` CSS-variable transform setups used by the old procedural petals.

**Keep:** `.hero`, `.hero-stage`, `.atmosphere`, `.aura-*`, `.haze`, `.side-caption-*`, `.hero-content`, all typography, `.scroll-cue`, everything below the hero.

## JS changes (`script.js`)

**Remove:** `RINGS` array, `createPetal`, `setClosedState`, the petal-building loops, `outerPetals` / `middlePetals` / `innerPetals` arrays, and bloom-timeline phases that target rings/petals/core. Also remove the `openLotusInstantly` ring/core logic; replace with the new reduced-motion fallback below.

**Keep:** GSAP/ScrollTrigger imports, header scroll state (section 7), waitlist form (section 8), language toggle (section 9), fonts-ready refresh (section 10), aura drift (section 6), section reveals (section 5).

**New `buildHeroTimeline()`** — scroll-pinned, scrub: 1.2, pin duration `+=100%`:

| Progress | Targets | Effect |
|---|---|---|
| 0.00 → 0.35 | `.lotus-photo` | opacity 0→1, blur 14px→0, scale 1.06→1.0, y +24→0 |
| 0.00 → 0.35 | `.lotus-glow` | scale 0.6→1.1, opacity 0.3→0.85 |
| 0.05 → 0.30 | `.side-caption` | opacity 0→0.6 |
| 0.35 → 0.55 | (hold) | photo settles, breathe loop visible |
| 0.50 → 0.65 | `.scroll-cue` | opacity → 0, y +16 |
| 0.55 → 1.00 | `.lotus-wrap` | y → -8vh, scale → 0.88 |
| 0.55 → 0.70 | `.side-caption` | opacity → 0 |
| 0.65 → 0.78 | `.eyebrow` | y +30→0, opacity 0→1 |
| 0.70 → 0.85 | `.hero-headline .line:nth-child(1) > span` | yPercent 105→0 |
| 0.74 → 0.89 | `.hero-headline .line:nth-child(2) > span` | yPercent 105→0 |
| 0.82 → 0.95 | `.hero-sub` | y +30→0, opacity 0→1 |
| 0.88 → 1.00 | `.hero-cta` | y +30→0, opacity 0→1 |

**Independent loops** (not scroll-bound, infinite):
- **Breathe:** `.lotus-photo` `scale: 1 ↔ 1.015`, 6s, `sine.inOut`, yoyo.
- **Petal drift:** for each `.dpetal`, animate `y: -8vh → 108vh` over 14–22s (varied per petal), `x: ±4vw` sway via `sine.inOut`, rotation `±40deg`. Stagger start delays: 0s, 3s, 5s, 8s, 11s, 13s. Opacity fades 0→0.8→0 across the lifetime. `repeat: -1`.
- **Aura drift:** existing loops (kept as-is).

**Reduced-motion fallback** (replaces `openLotusInstantly`):
- No pin, no scrub. `.lotus-photo` visible at rest. Hero copy fully visible. No breathe loop. Skip petal drift entirely (or run a single slow loop).

## File-by-file change summary

| File | Action |
|---|---|
| `assets/lotus-src.jpg` | New — Unsplash source JPG |
| `assets/lotus.png` | New — transparent cutout (rembg or user-supplied) |
| `index.html` | Replace SVG lotus block with `<img>` + petal-drift container |
| `styles.css` | Add `.lotus-photo`, `.lotus-glow`, `.petal-drift`, `.dpetal`; remove rules for `.ring-*`, `.core-*`, old `.petal`, `.lotus-shadow`, SVG `.bg-glow`, CSS var transforms |
| `script.js` | Remove procedural petal build + bloom phases; new `buildHeroTimeline`; new breathe + drift loops; new reduced-motion fallback |

## Out of scope

- Other page sections (story, promise, features, who, waitlist, contact, footer)
- The privacy.html page
- Mobile-specific layout changes (existing responsive rules should still work; verify only)
- Internationalization / Arabic RTL changes to the new elements
- Replacing photo with custom-licensed asset (using Unsplash license; attribution not required but noted)

## Verification

Manually open `index.html` in a browser after implementation and verify:
1. Photo loads and renders at appropriate size (no broken `<img>`).
2. Hero pins for ~1 viewport on scroll; photo fades/blurs in cleanly.
3. Breathe loop runs continuously after the reveal.
4. Petal-drift overlay shows 4–6 petals drifting down at any given time, not bunched.
5. Hero copy (eyebrow → headline → sub → CTA) reveals in sequence as scroll completes.
6. After the pin releases, scrolling further into "The quiet weight" section works normally.
7. Reduced-motion (`prefers-reduced-motion: reduce` in DevTools) shows static photo with copy visible immediately.
