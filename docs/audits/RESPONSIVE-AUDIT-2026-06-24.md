# Responsive / Mobile / Screen-Size Audit — The World in 100

Date: 2026-06-24
Scope: ONLY cross-screen-size adaptation and input modes (mobile 320px → desktop 1440px+). Data integrity and state-machine logic were covered by a prior architecture audit and are out of scope here.
Method: Live testing via Playwright (viewports 320x568, 375x667, 414x896, 768x1024, 1024x768, 1440x900, plus 667x375 landscape phone) + static analysis of CSS, lasso input handling, canvas/DPR sizing, and silhouette geometry.

---

## Verdict

Usable on standard portrait phones and clean on desktop, but the signature "dots morph into a shape" payoff is **broken on every landscape phone / short viewport** (silhouette inverts to a degenerate sliver), and the reveal panel wastes ~50% of width to oversized fixed padding on small screens while several text sizes and touch targets fall below accessibility floors. No horizontal overflow anywhere. Core touch input works.

---

## Severity-ranked findings

| Sev | Finding | Viewport(s) | Evidence | Fix |
|-----|---------|-------------|----------|-----|
| CRITICAL | `scalePaths` uses fixed `pad = 60` with no floor. On short viewports the mobile shapeBounds height (`innerHeight * 0.35 - 40`) drops below 120px, so `size = min(w, h)` goes **negative** → every shape coordinate (`p.x * size`) is mirror-inverted and collapsed into an unrecognizable blob. The whole "shape reveal" mechanic is lost. | All landscape phones and any viewport with `innerHeight < ~457px` (e.g. 667x375 → size **-28.75px**) | `silhouettes.js:407-413` (`pad=60`, no clamp); bounds at `main.js:261-262`; live screenshot `v667x375-reveal.png` shows a ~30px dot-cluster instead of a briefcase | Clamp usable size to a floor (`Math.max(MIN, ...)`) and shrink `pad` for small bounds (e.g. `pad = Math.min(60, bounds.width*0.1, bounds.height*0.1)`); and/or never let the mobile shape region collapse — base bounds on `min(width,height)` of the canvas region, not a flat 35% of height. |
| HIGH | Reveal stat panel uses oversized fixed horizontal padding on small screens: `padding: 4vh 90px 80px` (mobile). On a 320px screen that is **180px of padding**, leaving only ~140px for headline + body text. Text column is needlessly cramped and the right ~half of the panel is dead space. | 320, 375, 414, 667(landscape) | `main.css:911-918`; measured padding `22.7px 90px 80px`, text width ~140px at 320px; `v320-reveal.png` | Replace fixed `90px` side padding with a fluid/clamped value (e.g. `padding: 4vh clamp(20px, 6vw, 48px) 80px`). |
| HIGH | Body and source text render at 11px and the byline at 8-9px on mobile — below the ~12px legibility floor (and 16px iOS no-zoom threshold). Modes-card sub-labels and header render at 8px. | 320, 375, 414 (all `max-width:767px`) | `main.css:932-951` (stat-body 11px, byline 9px/8px), `main.css:997-998` (modes sub 8px), `main.css:982` (header 8px); detected live: `tinyText` list at 320px | Raise floors: body/source ≥ 12px, byline ≥ 10px, modes sub ≥ 10px. Use rem so OS text-scaling applies. |
| MEDIUM | Touch targets below the 44x44px guideline: theme toggle 36x36, `toggle-switch` (challenge + fog) 36x20, pace slider thumb track 16px tall, theme cards 42px tall (just under), reveal action buttons 30px tall on mobile. | All, esp. 320-414 (touch) | live `smallTouchTargets` at 320px; `main.css:733-737` (switch 36x20), `main.css:159-173` (toggle 36x36), `main.css:958-963` (btn 30px h) | Add invisible hit-padding (`::before` overlay) or grow controls to ≥44px min tap area; bump mobile action buttons to ≥40px and theme cards to ≥44px. |
| MEDIUM | Theme picker overlay is vertically centered (`align-items:center`) and on a short viewport becomes taller than the screen, pushing its header + close button **off the top edge** (clipped, not scrollable into view). The `max-height:80vh; overflow-y:auto` is on `__inner` but flex-centering still overflows the top. | Landscape phones / short screens (667x375 → inner `top: -28px`) | `main.css:275-302, 1001-1006`; live `clipsTop: true`, `innerRect.top -28`; `v667x375-themepicker.png` shows "Where does your mind go?" + X cut off | On short viewports switch picker to `align-items:flex-start` with top margin, or cap `__inner` height to `min(80vh, ...)` and ensure the whole sheet (incl. header) sits inside the viewport. |
| MEDIUM | At exactly 768px (tablet portrait) the layout flips to the desktop 50/50 split, but the stat panel inherits desktop padding `80px 150px 80px 72px` → only ~162px usable text width on a 384px panel. Action buttons wrap to 3 stacked rows; right 150px is dead space. The breakpoint flips before the panel is wide enough for the desktop treatment. | 768x1024 (and ~768-900px wide) | `main.css:431` (desktop padding), measured panel w=384 / text w~162; `v768-reveal.png` shows stacked buttons + large right gutter | Raise the row-layout breakpoint (e.g. to ~900px) or make the desktop right padding fluid (`clamp`) so the text column stays usable on narrow tablets. |
| MEDIUM | Mobile silhouette is small even on standard portrait phones because `pad=60` consumes most of the ~190px tall shape region. At 375x667 the shape renders at only ~73px; at 320 it is a faint ~30-40px cluster. The shape is recognizable but underwhelming vs. the 240-400px desktop rendering. | 320 (~size 73 region cramped), 375 (size 73), 414 (154) | `silhouettes.js:407`; live silhouette-size probe: 320→cramped, 375→73, 414→154, 768→114, 1024→242; compare `v375-reveal.png` vs `v1440-reveal.png` | Same fix family as the CRITICAL: scale `pad` to bounds and give the mobile shape region more height (it currently competes with the 70% stat panel). |
| LOW | `count-badge` headline is fixed at 72px with no mobile override; if it ever shows on a 320px screen alongside its " people" label it risks tight fit. Not triggered in the observed flow (badge stays hidden through reveal) but no responsive guard exists. | 320 (latent) | `main.css:236-266` (no `max-width` override for `.count-badge`) | Add a mobile font-size clamp for `.count-badge`. |
| LOW (out of scope, noted) | Dev server emitted a repeated console error `module '/src/data/loader.js' does not provide an export named 'findClosestStat'`. The on-disk `main.js` correctly imports `findExactStat` (verified by grep), so this is a **stale Vite HMR cache** artifact, not a current code bug. App flows all work. | n/a (dev only) | grep shows `findExactStat` in `main.js:13,241,368` and `loader.js:264`; console shows stale `?t=` module | Restart the dev server / hard-reload to clear; no code change needed. |

---

## Per-viewport observations

**320x568 (smallest phone)** — No horizontal overflow. Arena, instruction pill, theme toggle, and modes card all fit cleanly (`v320-arena.png`). Theme picker bottom-sheet fits (`v320-themepicker.png`). Reveal (`v320-reveal.png`): text is readable but jammed into a ~140px column by the 90px side padding; silhouette is a tiny ~30-40px blob; body 11px / byline 8-9px / buttons 30px-tall@10px all sub-floor. Panel content overflows vertically but scrolls fine; buttons reachable after scroll (`v320-reveal-bottom.png`).

**375x667 (iPhone SE / standard)** — No overflow. Star silhouette (children theme) recognizable at ~73px (`v375-reveal.png`). Dot-ratio strip renders. Same padding/text-size issues as 320 but with a bit more breathing room. Acceptable, not great.

**414x896 (large phone)** — No overflow. Best mobile silhouette at ~154px. Same text-size/padding/touch-target caveats.

**667x375 (landscape phone)** — CRITICAL silhouette inversion (size -28.75px) → degenerate blob instead of a briefcase (`v667x375-reveal.png`). Theme picker header + close clipped off top edge (`v667x375-themepicker.png`). Reveal stays in column layout (still `<768` wide), text reads OK because of horizontal room, but the shape payoff is destroyed. This is the worst-affected viewport.

**768x1024 (tablet portrait)** — Flips to desktop 50/50 row split. Silhouette OK (~114px). But desktop padding on the 384px panel crushes the text column and wraps buttons to 3 rows with a large right gutter (`v768-reveal.png`). Awkward in-between state at the breakpoint boundary.

**1024x768 (landscape tablet / iPad)** — Clean. Silhouette ~242px, row layout, no overflow. Reads as intended.

**1440x900 (desktop reference)** — Polished (`v1440-reveal.png`): large brain silhouette with visible outline guide, balanced 50/50 split, inline buttons, good type hierarchy. This is the target experience and highlights how degraded the small/landscape cases are by comparison.

---

## Touch vs mouse input

Input handling is genuinely dual-mode and works on touch:

- `lasso.js` binds **both** mouse (`mousedown`/`mousemove`/`mouseup`) and touch (`touchstart`/`touchmove`/`touchend`) listeners (`lasso.js:191-197`), with touch listeners registered `{ passive: false }` so `preventDefault()` can suppress page scroll during a draw. `getPos` reads `e.touches[0]` when present (`lasso.js:12-16`). Verified live: a synthetic touch lasso fired `lasso:drawstart` and `lasso:complete` capturing 10 dots.
- Canvas has `touch-action: none` (`main.css:44`) so the browser does not steal the gesture for scroll/zoom — correct for a freeform drawing surface.
- Touch ergonomics are accounted for: `CLOSE_THRESHOLD` is 65px on touch vs 40px on mouse (`lasso.js:5`), and the lasso stroke is thicker on narrow screens (`lasso.js:156`). The end-of-draw overshoot-recovery scan (`lasso.js:61-69`) helps imprecise finger closes.
- Fog mode reads `touchmove` for the proximity reveal (`arena.js:244-251`).
- Theme-picker drag is mouse+touch but intentionally disabled below 640px (`themePicker.js:92`), where it becomes a fixed bottom sheet — sensible.
- `-webkit-tap-highlight-color: transparent` is set on interactive controls, avoiding the grey tap flash.
- The app is NOT pointer-events-based (no `pointerdown`); it uses parallel mouse+touch. This works but means a hybrid/stylus device firing only pointer events without mouse compatibility events is untested. Low risk on current targets.

Main touch gap is **target size** (see MEDIUM finding): the toggle switches (36x20), theme toggle (36x36), slider thumb, and mobile action buttons (30px tall) are below the 44x44 recommendation, making them fiddly on a phone.

---

## What is NOT a problem

- **No horizontal overflow** at any tested viewport (320 → 1440). `scrollWidth === innerWidth` everywhere.
- **Viewport meta** is present and correct: `width=device-width, initial-scale=1.0`, and crucially it does **not** disable zoom (`index.html:6`) — pinch-zoom remains available to users.
- **DPR handling** is correct: `arena.resize()` sets `canvas.width = round(w*dpr)` and `ctx.setTransform(dpr,0,0,dpr,0,0)`, and rescales circle positions proportionally on resize (`arena.js:20-39`). Crisp on retina; survives window resize. (Minor latent: in-flight animation `targetX/targetY` are not rescaled on resize, so rotating *during* the reveal animation could leave shape targets in stale coords — edge case, low priority.)
- **Share/download card** is a fixed 1080x1080 off-DOM canvas (`share.js:64-66`), fully viewport-independent — the exported image is identical regardless of screen size. Web Share API + clipboard fallback both present and detected.
- **Headline** uses `clamp(28px, 4vw, 48px)` (`main.css:457`) — good fluid type (though overridden to a flat 22px on mobile).
