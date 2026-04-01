# World in 100 — Development Progress

Updated: 2026-04-01 (session 5)

## Overall Status
Core desktop experience polished and mobile-ready. All 12 themes functional with shape silhouettes. Design system: Gambetta + Karla, warm amber palette. Modes card, challenge mode, fog mode, share card all working. Lasso redesigned as boundary-based (only closes when user draws back to start). Mobile audit complete. Stats cleaned up — awkward headlines rewritten, near-duplicates removed, 3 new themes added (inequality, women & girls, children). Share card hardened for iOS. Theme picker resized smaller and centered. Full stat audit completed — 6 data accuracy fixes applied.

## How to Update This Document

1. Read the whole document before editing
2. Use today's date from the environment for timestamps
3. Add new achievements with dates and specific details
4. Remove contradictions — keep only the latest version of any decision
5. Eliminate duplication — consolidate similar information
6. Update Open Questions based on what was resolved
7. Maintain structure and sections

---

## Completed Milestones

### Core experience
- 2026-03-30 — **Design system overhaul**: Fonts → Gambetta (serif) + Karla (sans); palette → cream `#eee8dc`, dark navy `#1d2438`, amber `#c47d18`; dark mode slider toggle replaces icon button
- 2026-03-30 — **Lasso mechanics**: Live barrier deflection, polygon constraint keeps captured balls inside closed shape
- 2026-04-01 — **Lasso redesigned as boundary**: Only closes + fills when user draws back within threshold of start point; snap indicator (circle) shows at start point when close enough; `simplifyPath` (Ramer-Douglas-Peucker) added to reduce ray-casting errors; threshold 65px on touch / 40px on desktop
- 2026-04-01 — **Lasso no longer ends on mouseleave**: `mousemove`/`mouseup` listeners moved to `document` so drawing continues if cursor leaves canvas
- 2026-03-30 — **Uniform ball size**: All 100 circles 6px radius, expand to target radius on reveal
- 2026-03-30 — **Theme picker**: Draggable popup (desktop only), X to dismiss (clears lasso + highlight, keeps balls), 3 random options, outline SVG icons, copy "Where does your mind go?"
- 2026-04-01 — **Theme picker resized**: Smaller and vertically centered; max-width 300px (280px mobile), tighter padding, smaller font sizes
- 2026-04-01 — **Theme picker event leak fixed**: Window-level drag listeners now cleaned up on close and theme select
- 2026-03-30 — **Reveal panel**: 50/50 split, stat panel slides in from right, dot ratio grid, "Read more here" source link; "X in 100" highlighted gold in headline
- 2026-03-30 — **Shape silhouettes wired live**: All 12 themes have SVG shapes; solid gold outline fades to 0.15 opacity and stays; dots lerp to outline positions
- 2026-04-01 — **Skip shape for ≤5 dots**: `capturedCount > 5` guard prevents shape animation for tiny selections
- 2026-03-30 — **Flying dots bug fixed**: Uncaptured circles freeze immediately on fade-out
- 2026-04-01 — **Dot movement speed**: Lerp factor at 0.06
- 2026-03-31 — **Context-aware cursor**: open circle SVG cursor on canvas hover; cursor:none during drawing; auto-restores; color updates with dark/light toggle
- 2026-03-31 — **Rogue dot fix**: `animateToPositions` fades out any captured dot with no shape position slot
- 2026-03-31 — **Shape symmetry fix**: Dot sampling uses largest-remainder method for exact counts
- 2026-04-01 — **Dots inset toward centroid**: `insetTowardCentroid()` nudges positions inward by `targetRadius * 0.75` to prevent dots rendering outside outline

### UI / modes
- 2026-03-31 — **Modes card**: Unified settings card at bottom-left. Three modes: "Find the answer" (challenge), "Pace" (speed slider), "Seek" (fog mode)
- 2026-04-01 — **Instruction pill restyled**: Matches modes card aesthetic — `var(--bg)` background, 14px border-radius, shadow-md, 13px font-weight-500; text changed to "Draw around any number of dots."
- 2026-03-31 — **Challenge mode comparison card**: Four verdict tiers: exact → within 5 ("So close.") → within 20 ("Did that surprise you?") → way off ("Way off — but now you know.")
- 2026-03-31 — **Fog mode**: Dots render at ~7% opacity; illuminate within 110px of cursor
- 2026-04-01 — **Fog mode touch support**: Added `touchmove`/`touchend` listeners in arena.js so fog works on mobile
- 2026-03-31 — **Speed mode**: Multiplier range 0.15× – 3.0×; default slider position 30 ≈ 1×
- 2026-04-01 — **Slider opacity**: Raised from 0.45 → 0.65 at rest, 1.0 on hover

### Reveal panel
- 2026-03-31 — **Reveal panel spacing**: Padding `80px 150px 80px 72px`
- 2026-03-31 — **Shape left margin**: Shape zone offset 150px from left screen edge
- 2026-03-31 — **Typography**: Headline `line-height` 0.9; stat text after "X in 100" at 0.6em
- 2026-04-01 — **Dot ratio transition**: Uses `max-height` CSS transition + `.expanded` class instead of instant insert
- 2026-03-31 — **Dot ratio grid**: 7px dots, 4px gap; now fluid with `min(7px, 1.8vw)` for mobile
- 2026-04-01 — **Byline**: Opacity raised to 0.7
- 2026-04-01 — **Source text**: Added `opacity: 0.7` to soften in dark mode

### Share / export
- 2026-03-31 — **Share button split**: "Share" → Web Share API with URL; "Save image" → 1080×1080 PNG
- 2026-03-31 — **Share card redesigned**: Left/right split layout; Gambetta font
- 2026-04-01 — **Share card spacing tightened**: Gap after "X in 100" line increased to +18px; source gap reduced to 14px; `blockH` recalculated to match
- 2026-04-01 — **Font loading hardened**: `Promise.race` with 1.5s timeout so canvas draw proceeds even if fonts fail to load
- 2026-04-01 — **iOS share fallback**: Web Share API rejection now falls back to clipboard copy instead of silently failing

### Meta / SEO
- 2026-04-01 — **Title**: "The World in 100"
- 2026-04-01 — **Description**: "If the world were 100 people — draw to discover."
- 2026-04-01 — **OG + Twitter Card tags**: og:title, og:description, og:type, twitter:card, twitter:title, twitter:description
- 2026-04-01 — **Favicon**: Outlined globe SVG in accent amber (`#c47d18`)
- 2026-04-01 — **Theme picker close button**: SVG X icon instead of `&times;` character

### Mobile readiness (2026-04-01)
- **Dot animation area**: Uses top 40% of screen on mobile (<768px) instead of collapsed left-half
- **Modes card**: Full-width on mobile (`left: 12px; right: 12px; width: auto`)
- **Theme picker drag**: Disabled on mobile (<640px) — bottom sheet only
- **Tap targets**: Close button 44x44px, mode rows min-height 44px on mobile
- **Small text**: `.stat-source` → 13px, `.stat-byline__sub` → 11px on mobile
- **Theme picker**: `max-height: 80vh; overflow-y: auto` on mobile
- **Lasso snap threshold**: 65px on touch vs 40px on desktop

### Stats database
- 2026-03-30 — **8 themes, 110+ stats**: mental_health, climate, hunger, education, health, work_life, ai_tech, universal
- 2026-04-01 — **Water replaced with Social**: 10 stats covering loneliness, friendship, relationships, parenting, care, trust. Sources: WHO, Meta-Gallup, Ipsos, BBC, Gottman Institute, ILO, WHR. Shape: Lucide `users` icon.
- 2026-04-01 — **3 new themes added**: inequality (10 stats, iq_01–iq_10), women_girls (10 stats, wg_01–wg_10), children (10 stats, ch_01–ch_10). Total: 12 themes.
- 2026-04-01 — **3 awkward headlines rewritten**: cl_01 (dollars of GDP → dollars the world earns), at_01 (units of electricity → the world's electricity), cl_16 (units of energy → the world's energy)
- 2026-04-01 — **3 near-duplicate stats removed**: mh_15, he_15, he_17
- 2026-04-01 — **Full stat audit — 6 fixes**: he_05 cancer stat was 10x off (n:7→20, reframed as lifetime risk); iq_08 n=50 represented emissions % not people (headline reframed to "50 in 100 tonnes..."); iq_06 internet stat n:37→33 (matched ITU source data, was inconsistent with at_05); ch_10 measles n:85→83 (matched body's 83%); mh_05 PTSD added "high-income countries" qualifier (n=7 is HIC rate, global is 3.9%); iq_03 headline rewritten to start with number for regex highlight/challenge masking

---

## Architecture

| File | Purpose |
|------|---------|
| `src/main.js` | State machine: arena → lasso → theme-pick → reveal; wires up all mode controls |
| `src/canvas/arena.js` | Physics loop, 100 circles, elastic collisions, `animateToPositions`, `fadeOutUncaptured`, fog mode (mouse + touch), speed multiplier |
| `src/canvas/lasso.js` | Freehand draw, boundary-based closure detection, live barrier deflection, polygon capture, Ramer-Douglas-Peucker simplification |
| `src/data/loader.js` | All stat data + `findClosestStat` |
| `src/data/silhouettes.js` | SVG path parser + all 9 theme shapes; `getShape()` returns outline + positions; largest-remainder dot sampling; centroid inset |
| `src/ui/reveal.js` | Reveal animation sequence, dot ratio grid, hides modes tray |
| `src/ui/share.js` | 1080×1080 image card generation + Web Share API + download |
| `src/ui/themePicker.js` | Theme selection overlay with SVG icons; draggable on desktop, bottom sheet on mobile; cleans up listeners |
| `src/styles/main.css` | Layout, components, animations, modes card, toggle switch, mobile breakpoints |
| `src/styles/themes.css` | Design tokens (light/dark + per-theme accents) |

---

## Key Decisions

- **Fixed verified n-values** — `findClosestStat` picks nearest real data point; no dynamic substitution
- **Dots trace outline only** — no interior fill; shape recognised from outline alone
- **Solid outline** — solid 3px gold line fades to 0.15 opacity and persists
- **Shape SVG source** — Lucide icons parsed via custom SVG path parser in `silhouettes.js`
- **All 12 themes have shapes** — climate: cloud-sun, education: book-open, social: users, women_girls: venus symbol, children: star, inequality: sad face, etc.
- **Lasso = boundary, not polygon** — only closes when user draws back near start; no auto-fill for open paths
- **Challenge mode flow** — comparison card → "See the full story" → full reveal
- **Modes as a card** — three independent controls grouped in a single card; modes hide on reveal
- **Share = link, Save = image** — separate flows for URL sharing vs PNG download

---

## Open Questions / Next Steps

### Done (session 4)
- [x] Fix awkward unit-based headlines: cl_01, at_01, cl_16
- [x] Consolidate near-duplicate stats: removed mh_15, he_15, he_17
- [x] Add new themes: inequality, women_girls, children (10 stats each)
- [x] Wire `og:image` meta tag (OG + Twitter Card tags added)
- [x] Share card fonts: timeout fallback added
- [x] Very few captured dots (≤5): skip shape animation
- [x] iOS share: clipboard fallback on Web Share API failure

### Done (session 5)
- [x] Full stat audit: verified all 137 stats across 12 themes — n matches headline for every entry
- [x] Fixed he_05 cancer stat (was 0.7% claimed as 7%, reframed to lifetime risk n=20)
- [x] Fixed iq_08 dot/stat mismatch (n=50 was emissions %, not people — headline reframed)
- [x] Fixed iq_06/at_05 contradiction (same stat, different n — aligned iq_06 to n=33)
- [x] Fixed ch_10 headline/body mismatch (n=85 but body said 83%)
- [x] Fixed mh_05 global vs HIC framing (added "high-income countries" qualifier)
- [x] Fixed iq_03 headline for regex compatibility (challenge masking + gold highlight)

### Remaining
- [ ] OG preview image: save a screenshot to `public/og-image.png` (meta tags wired, image file needed)
- [ ] Heatmap overlay — aggregate ghost of all lassos ever drawn (needs backend)
- [ ] Visually test all 3 new themes (inequality, women_girls, children) — shapes, icons, accent colors
