# Consolidated Audit — The World in 100 (statistical-truth integrity)

**VERDICT: FRAGILE.** The 177 displayed numbers are correct, sourced, and self-consistent *today* (0 headline-vs-n mismatches, 0 missing sources, 0 n-collisions — all verified), but the app has zero mechanical guard keeping them that way and four distinct silent-failure paths (replay strand, share-card 0-dot fallback, silhouette dot-drop, exact-match-only resolver) through which a wrong, missing, or unreproducible number can already reach a viewer or a shared artifact.

---

## Executive verdict (prose)

This is a public, share-driven data-visualisation whose entire purpose is to put a true "N in 100" claim in front of a stranger and have that number survive intact into a downloadable image and a re-openable link. On the **data plane** it currently succeeds: a full sweep of `src/data/loader.js` confirms all 177 stats parse `^N in 100`, every leading headline integer equals `stat.n`, every stat has a non-empty `source` and `sourceUrl`, the `iq_06`/`at_05` "never used the internet" pair is aligned at n=33, and no theme has two stats sharing an `n` (so today's count-based replay happens to be deterministic). The six historically-broken stats (he_05, iq_08, iq_06, at_05, ch_10, mh_05) all re-verify clean.

On the **transport and rendering plane** it is fragile in ways that ship to production. The deployed bundle (`dist/assets/index-BFY_6yTH.js`, confirmed by grep) carries two integrity-relevant defects: the share-card grid silently paints 0 dots for any non-numeric `n` while the reveal grid clamps-and-rounds — divergent encodings of "the same number" — and the no-match resolver flips the app into `reveal` state *before* checking a stat exists, then bare-`return`s, stranding the viewer on a blank screen with no error and no recovery. That strand is reachable by any hand-edited or stale share link across ~913 of 1089 (theme, count) pairs, including the sanctioned `universal` theme on every count except 100. Separately, the silhouette sampler drops captured dots in 34 count-ranges (e.g. mental_health 9-15 all render 8 dots, ai_tech 15-27 render 14), so the arena animation can visually contradict the captured count even when the reveal panel is correct.

None of these are live numeric corruptions of the dataset — they are latent traps and transport bugs. But the constitution's north-star ranks "how far a wrong/unreproducible number can travel before a human notices" as the severity axis, and three of these (share-card 0, replay strand, dot-drop) travel all the way to the viewer/artifact with no human in the loop. The single highest-leverage gap is the **total absence of verification infrastructure** (no tests, no CI, no `verify` script): the exact headline-vs-n mismatch class that shipped six times has nothing but human eyeballs guarding it on the next edit.

---

## Top concerns — ranked (by distance a wrong/unreproducible number can travel)

| # | Title | Sev | Area | Found by | Why it matters | Recommendation |
|---|-------|-----|------|----------|----------------|----------------|
| 1 | No verification/test/CI exists — every DOD is unenforced; the 6x headline/n class has no guard | CRITICAL | CI / durability | **informed-only** (ABS-01) | Data is clean today but nothing keeps it clean; the failure mode that shipped 6x is one edit away with only human review between it and a viewer | Add `scripts/verify-stats.mjs` (headline==n, source+url present, regex coverage, no dup n) + `npm run verify` + a CI workflow gate |
| 2 | Shared-link replay strands the viewer mid-reveal on no-match (state='reveal' set before `if(!stat)return`) | CRITICAL | Replay / state machine | **BOTH** (INV-01, DOD5/DOD6, ABS-03/04, STAT-02, SHARE-02) | A stale/edited/typo'd link (913/1089 theme+count pairs, incl. `universal&n≠100`) lands on a blank frozen screen — the shared artifact silently fails to reproduce | Resolve+validate the stat *before* `state='reveal'`; on null route to the visible empty state and stay in `arena` |
| 3 | Share card paints 0 dots for non-numeric `n` and skips reveal's clamp/round — divergent encodings | HIGH | Share-card grid | **BOTH** (INV-02, DOD4, ABS-05, blind INV-4 PARTIAL) | A future typo'd `n` ships a polished 1080×1080 image asserting the headline in prose but "0 in 100" in dots — corruption straight into a social artifact; ships in current bundle | Use the identical `Math.max(0,Math.min(100,Math.round(n)))` as reveal.js via a shared helper; throw/abort the card on non-finite `n` |
| 4 | Silhouette sampler drops captured dots in 34 count-ranges — arena shows fewer dots than the captured count | HIGH | Geometry / sampleAlongPaths | **blind-only** (GEO-01) | User lassos 13 dots, headline says 13, but the formed shape has only 8 — the visual silently lies about the authoritative count (5 fade to opacity 0) | In the `remaining<0` branch, allocate greedily to `dotsForPaths` (one-at-a-time longest-path-first) so `positions.length === min(count, capacity)`; add an assertion |
| 5 | Replay ignores the `s` (statId) it encodes — stat re-derived from count, reproducibility unenforced | MEDIUM | Replay determinism | **BOTH** (INV-03, ABS-02, DOD6-statid, STAT-01, SHARE-01) | The one field that would pin the exact shared stat is parsed then discarded; reproducibility rides on the accident that no theme has two stats with the same `n` | Look up `shared.statId` first, validate it exists in the theme and its `n` matches the URL `n`, pass as `preSelectedStat`; fall back to count only when absent |
| 6 | `findClosestStat` is exact-match-only despite its name (misleads future callers) | MEDIUM | Data resolver naming | **BOTH** (DOD5, ABS-03, blind STAT-02) | Name implies nearest-match; body is `s.n===capturedCount`. Future callers will assume it always returns a stat — feeds #2 | Rename `findExactStat`, OR make it genuinely nearest with a documented tolerance + guarantee coverage |
| 7 | `n=0` (and any gap count) passes the replay clamp but matches no stat in any theme | MEDIUM | Replay hostile param | **informed-only** (INV-04, subset of ABS-04) | `?t=anything&n=0` clears validation then strands (feeds #2); clamp admits a value guaranteed to dead-end | Covered by #2's "require exact stat before reveal"; treat n=0/gap as routed empty state |
| 8 | Bodies that never state the headline figure: mh_13 (n=55), wg_01 (n=1) | MEDIUM | Body corroboration | **informed-only** (INV-05, blind INV-2 PARTIAL) | Reader cannot reconcile the dot grid's 55/1 against any number the body gives — weakens end-to-end self-consistency though each figure is individually sourced | Restate the headline figure in each body, or re-anchor the headline to the body's actual framing |
| 9 | mh_01 body contradicts its own n: "1 in 300" (≈0.33%, rounds to 0) vs n=1 | MEDIUM | Data accuracy | **blind-only** (STAT-03) | Headline+n say 1-in-100; body's cited point-prevalence is 1-in-300 — the body's authority undercuts the drawn number ~3× | Reframe to consistent lifetime-prevalence (~1%) with a matching source, or to "about 1 in 300" |
| 10 | `constrainToPolygon` leaves dots outside on thin lassos; teleports across concave lobes; NaN on 0-dim resize | MEDIUM | Geometry / arena | **blind-only** (GEO-02/03/04) | Captured count stays correct but the constraint visibly fails / a 0-dim resize poisons coords with NaN permanently | Clamp to edge point when thickness < 2(r+0.5); guard rescale `oldW>0?w/oldW:1`; skip rescale when w/h===0 |
| 11 | `scalePaths` fixed 60px pad has no floor — negative size mirror-flips/collapses silhouette on small viewports | MEDIUM | Geometry / silhouettes | **blind-only** (GEO-05) | On short-landscape phones the shape renders inverted/tiny; target positions wrong — shown shape ≠ icon | `size = Math.max(0, Math.min(w,h))`; scale pad to bounds or bail to grid when size≤0 |
| 12 | Degenerate/collinear lasso passes the length≥3 guard → fabricated capturedCount of 0 | MEDIUM | Geometry / lasso | **blind-only** (GEO-06) | A line gesture the closure accepts reports an authoritative count of 0 and advances — the trusted number is fabricated, not rejected | After simplify+snap, reject when `|signed area| < ε` (treat as not-closed) |
| 13 | he_14 body 47.4% → complement 52.6 rounds to 53, but n=52 (floor) | LOW | Body corroboration | **informed-only** (DOD2-he14) | Strict reader sees body imply 53 vs dots/headline 52 — one-off rounding, not fabrication | Set n=53, or add "about 52% lack coverage" to the body |
| 14 | Uncancellable setInterval/timeout timers in handleThemeSelected outline + arena anim leak on re-entry | MEDIUM | Timer cleanup | **blind-only** (GEO-07, REVEAL-01, STATE-01) | Challenge-continue / replay re-run handleThemeSelected without reload → two interval loops fight over shared circle state; masked today by reload-on-restart | Store and clear interval/timeout ids at top of handleThemeSelected; let arena cancel in-flight anim |
| 15 | Challenge-continue carries arena constraint from challenge round into the story reveal | LOW | State handoff | **blind-only** (STATE-01) | Constraint set at main.js:189 never cleared on the continue path; silhouette animates against still-constrained circles | Call `arena.clearConstraint()` on the continue path; unify both overlay-exit paths through one reset |
| 16 | No `vercel.json` — no CSP / security headers for a param-driven public app | LOW | Deploy config | **blind-only** (INFRA-01) | Defense-in-depth only; current sinks are escaped (reveal/challenge) — not an active vuln | Add minimal CSP (Fonts + Vercel Analytics), `X-Content-Type-Options: nosniff`, `Referrer-Policy` |
| 17 | OG/Twitter image uses root-relative `/og-image.png` — scrapers need absolute URL; link previews likely break | LOW | OG / preview | **blind-only** (INFRA-03) | Share is the core distribution channel; relative og:image renders no preview on most platforms | Use absolute `https://theworldin100.vercel.app/og-image.png`; remove orphan `preview.png` |
| 18 | `universal` missing from SVG_SHAPES/iconMap → shared n=100 link renders shapeless grid (graceful) | LOW | Theme cross-map | **blind-only** (STAT-04) | Cosmetic; degrades to grid, no crash; direct-draw-100 path unaffected | Add a `universal` globe glyph to SVG_SHAPES, or document the grid fallback as intentional |
| 19 | Vercel Analytics `inject()` is an unconditional import side-effect — 404s in dev/non-Vercel | LOW | Analytics | **blind-only** (ANALYTICS-01) | Noisy console in local QA; no production correctness impact | Guard behind `import.meta.env.PROD` |
| 20 | Stale local `dist/` predates the lasso-overshoot fix; `#count-badge` dead UI; climate picker/silhouette glyph drift | LOW | Build / dead code | **blind-only** (INFRA-02, DOM-01, STAT-05/06) | dist gitignored (Vercel rebuilds, prod fine); count-badge never written by JS; cosmetic glyph mismatch | Rebuild or delete local dist; wire or delete count-badge; align climate glyphs |

---

## What's good (verified strengths to protect)

- **Dataset is numerically sound today.** `node` sweep over `loadStats()`: `TOTAL STATS: 177`, `HEADLINE-vs-n MISMATCHES: 0`, `MISSING SOURCE: 0`, `MISSING URL: 0`, `DUPLICATE IDS: []`. (DOD-1, INV-1, INV-3 all pass.)
- **The six historically-broken stats re-verify clean.** he_05 (n=20, "1 in 5"✓), iq_08 (n=50, "tonnes"+"half", subject = emissions not people✓), iq_06/at_05 (both n=33, both "2.6 billion / one third"✓ — `ALIGNED`), ch_10 (n=83, "83%"✓), mh_05 (n=7, "6-8% in high-income"✓). DOD-2's named re-verification passes.
- **Regex coverage is exactly as specified.** Every headline matches `^\d+ in \d+` except the single whitelisted `universal_100` ("All 100 of us..."). The one multi-number headline, `wg_14` ("95 in 100 ... but only 36 in 100..."), correctly encodes its FIRST number (95) as `stat.n`. (INV-7, DOD-7 pass.)
- **Reveal dot grid is correctly clamped.** `reveal.js:60` `const safeN = Math.max(0, Math.min(100, Math.round(statN)))` — the reveal surface is robust to bad `n`. (Half of INV-4.)
- **Challenge mode is honest.** `main.js:137` masks via `replace(/^\d+ in \d+/, '___ in 100')` (hides exactly the leading number); `main.js:202` shows `challengeStat.n`; verdict tiers at diff 0/5/6/20/21 label correctly with no off-by-one; "See full story" passes the same `challengeStat` as `preSelectedStat`, so the challenge number equals the full-reveal number. (INV-8, DOD-8 pass.)
- **No within-theme `n` collisions** (verified: zero) — so count-based replay is deterministic *today*, and **no untrusted text reaches an unescaped innerHTML sink** (reveal.js:25, main.js:136/336 all escape `[<>&"]`; themePicker uses trusted in-repo constants). (XSS-01 confirmed non-vuln.)

## What's bad (active risks that can fail today)

- **Replay strand ships in the bundle (#2).** `main.js:238` sets `state='reveal'` before `main.js:243 if(!stat)return;`; `findClosestStat` (loader.js:263) is exact-only; replay (main.js:347-356) validates only theme-exists + clamp and calls `handleThemeSelected` with no preSelectedStat. Shipped: `grep dist/...js` → `.find(e=>e.n===t)||null`. Any of 913/1089 (theme,count) pairs — incl. `?t=universal&n=50` — freezes the viewer on a blank reveal with no recovery but reload.
- **Share card 0-dot fallback ships in the bundle (#3).** `share.js:89` `typeof stat.n === 'number' ? stat.n : 0` with no round/clamp, loop `i < statN` (share.js:103-114). Shipped: `grep dist/...js` → `typeof e.n==`number`?e.n:0`. A non-numeric `n` produces a self-contradicting share image. Diverges from reveal.js's clamp.
- **Silhouette dot-drop (#4)** — verified against the real module: 34 count-ranges under-render (mental_health 9-15→8, ai_tech 15-27→14, climate 7-11→6, social 5-7→4, work_life 5-6→4, women_girls 4-5→3, education 3→2, inequality 5→4). The captured dots beyond capacity fade to opacity 0 (arena else-branch). The arena visually contradicts the captured count.

## What needs to improve (latent gaps, not yet failures)

- **Reproducibility is unenforced (#5, #6, #7):** the `s` param is decorative; `findClosestStat` is misnamed; `n=0`/gap counts pass validation into the strand. All safe today only because no theme has duplicate `n` — an invariant nothing protects.
- **Body-corroboration soft spots (#8, #9, #13):** mh_13 and wg_01 bodies never state their headline figure; mh_01's body figure (1-in-300) contradicts n=1; he_14's complement rounds to 53 not 52. Each figure is individually sourced — these are traceability/self-consistency gaps, not fabricated values.
- **Geometry robustness (#10, #11, #12, #14, #15):** thin/concave lassos, 0-dim resizes, small viewports, and re-entrant reveals can corrupt the *visual* (never the dataset). Lowest on the truth axis but several are silent.

---

## Blind vs informed

**Found by BOTH (highest signal — independently hit by a blind subsystem auditor and an informed constitutional auditor):**

- **Replay strand (#2)** — blind STAT-02 / SHARE-02 ("findClosestStat null → early return, no reveal", "stranded mid-transition") AND informed INV-01 / DOD5-strand-themepick / DOD6-replay-strand / ABS-03 / ABS-04. Verified: `state='reveal'` (main.js:238) precedes `if(!stat)return` (main.js:243).
- **Share-card 0-dot / clamp divergence (#3)** — blind INV-4 PARTIAL ("share.js applies NO round/min/max") AND informed INV-02 / DOD4 / ABS-05. Verified: share.js:89 vs reveal.js:60, present in dist bundle.
- **Dead `s` statId param / unenforced replay determinism (#5)** — blind STAT-01 / SHARE-01 AND informed INV-03 / ABS-02 / DOD6-statid. Verified: written share.js:22, parsed share.js:251, never read in main.js.
- **`findClosestStat` exact-only despite name (#6)** — blind STAT-02 (implicit) AND informed DOD5 / ABS-03. Verified loader.js:263.

**Informed-only (latent / history-specific — the rubric caught what subsystem reads would not):**

- **No CI/test/verify infra (#1, CRITICAL)** — ABS-01. The single most important finding and a *process* gap; no blind subsystem auditor was scoped to notice the absence of a guard. Verified: empty `scripts/`, no `.github`, no test files, `package.json` has only dev/build/preview.
- **`n=0` / gap-count clamp admits a strand value (#7)** — INV-04.
- **Body never states headline figure: mh_13, wg_01 (#8); he_14 rounding (#13)** — INV-05 / DOD2. Requires reading the body against the cited figure with the invariant in hand.

**Blind-only (rubric blind spots — the constitution's 8 invariants don't cover the canvas/geometry/infra surface, so only fresh-eyes subsystem reads found these):**

- **Silhouette dot-drop (#4, HIGH)** — GEO-01. The constitution's INV-4 is about the *reveal* and *share* dot grids (which key on `stat.n` and are correct); it does not cover the *arena silhouette* sampler, which keys on `capturedCount`. This is a real integrity-of-the-displayed-count bug that the invariant lens structurally missed. Verified against the real module: 34 under-render cases.
- **All geometry robustness (#10, #11, #12, #14, #15)** — GEO-02/03/04/05/06/07, REVEAL-01, STATE-01.
- **All infra/deploy/dead-code (#16-#20)** — INFRA-01/02/03, ANALYTICS-01, DOM-01, STAT-04/05/06, XSS-01.

**Adjudicated contradictions / severity reconciliations:**

- **Blind GEO-01 rated HIGH vs no informed mention.** Not a contradiction — a coverage gap. I kept it HIGH (#4): it ships, it's silent, and it makes the on-screen dot count contradict the authoritative captured count, which is squarely on the north-star axis even though no invariant names it.
- **mh_01 (blind STAT-03, MEDIUM) vs informed INV-05 flagging mh_13/wg_01 but not mh_01.** Both are real and distinct. mh_01's body actively *contradicts* n (1-in-300 vs n=1) — slightly worse than mh_13/wg_01 which merely *omit* the figure. I kept mh_01 at MEDIUM (#9) and mh_13/wg_01 at MEDIUM (#8); none rise to HIGH because all are static, individually-sourced, and visible on a surface a human author can recheck.
- **Severity of the replay strand: blind said MEDIUM (STAT-02/SHARE-02), informed said CRITICAL/HIGH (INV-01, DOD6).** I adjudicated **CRITICAL (#2)**: it ships in the bundle and the shared artifact (the whole product) silently fails to reproduce across the majority of the input space — the north-star's most-severe class.
- **No claim was dropped as unreproducible.** Every CRITICAL/HIGH and every data/geometry/infra claim was reproduced against the actual code at `.` (commands and results inline above and in §What's bad).

---

## Compliance matrix

| Rule | Status | Evidence |
|------|--------|----------|
| INV-1 — headline int == stat.n | **MET** | Sweep: 177 stats, `HEADLINE-vs-n MISMATCHES: 0`; only non-parse is whitelisted `universal_100` |
| INV-2 — body corroborates n, subject matches | **PARTIAL** | 175/177 corroborate; mh_13 (n=55, body "exceeds 50%/approaches 90%", never 55), wg_01 (n=1, body "1 in 37"/"1 in 7,800", never 1-in-100), mh_01 (body "1 in 300" contradicts n=1), he_14 (47.4%→52.6 rounds to 53 not 52) |
| INV-3 — sourced + attributable, no contradicting dup | **MET** | `MISSING SOURCE: 0`, `MISSING URL: 0`; iq_06/at_05 both n=33 `ALIGNED` |
| INV-4 — dot grids conserve count exactly, no silent 0 | **PARTIAL** | reveal.js:60 clamps; share.js:89 does NOT round/clamp and substitutes 0 for non-numeric `n` (ships in dist). All current `n` integer 0..100 so surfaces agree today, but the contract is violated |
| INV-5 — missing input fails loud, never silent zero/no-op | **UNMET** | findClosestStat exact-only (loader.js:263) returns null on 79-85/99 counts per theme; handleThemeSelected sets `state='reveal'` (238) before `if(!stat)return` (243) → silent strand; share.js falls back to n=0 |
| INV-6 — number reproducible/immutable across surfaces | **PARTIAL** | Hostile params clamped/theme-checked; `s` statId written+parsed but never used on replay (stat re-derived from count); reproducible today only because zero within-theme `n` collisions; n=0/gap routes into the strand |
| INV-7 — every headline parses canonical form | **MET** | All match `^\d+ in \d+` except whitelisted `universal_100`; wg_14 multi-number encodes FIRST number (95)=n |
| INV-8 — challenge never leaks/misstates the answer | **MET** | Mask hides leading number (main.js:137); answer=challengeStat.n (202); tiers correct at 0/5/6/20/21; challenge number == full-reveal number (same stat passed as preSelectedStat) |

**Score: 4 MET / 3 PARTIAL / 1 UNMET (of 8).** The data-plane invariants (1, 3, 7, 8) are fully met; every PARTIAL/UNMET is a *transport/rendering/no-match* failure (2, 4, 5, 6) — the dataset is true but its delivery is not yet dependable.

DOD status: **DOD-1 PASS** (0 mismatches), **DOD-2 PARTIAL** (6 historic stats re-verify; 4 body soft-spots), **DOD-3 PASS** (complete sources, aligned pair), **DOD-4 FAIL** (share 0-dot, no shared clamp), **DOD-5 FAIL** (strand, misnamed resolver), **DOD-6 FAIL** (913/1089 strand, `s` ignored), **DOD-7 PASS**, **DOD-8 PASS**. And the meta-gap: **none of DOD-1..8 is automated** (ABS-01) — all were re-derived ad hoc for this audit.

---

## Recommended fix order (highest leverage first, dependency-collapsing)

**Fix A — Add the verification gate (`scripts/verify-stats.mjs` + `npm run verify` + CI).**
A script that asserts: leading-int(headline)===n for all 177 (whitelist `universal_100`); every stat has non-empty source+sourceUrl; no duplicate ids; no within-theme duplicate `n`; iq_06/at_05 share `n`; every headline matches `^\d+ in \d+` except universal; every `n` is a finite integer 0..100. Wire as a CI step on PR.
→ Closes **#1**, converts **DOD-1/2/3/7** from prose into a gate, and makes the latent half of **#3** (non-numeric n) impossible to merge. This is the keystone: it protects the one thing that's currently good (clean data) from the next edit.

**Fix B — Make stat resolution loud and reproducible before any reveal transition.**
(1) Rename `findClosestStat` → `findExactStat`. (2) In `handleThemeSelected`, resolve+validate the stat *before* `state='reveal'`; on null, route to the existing themePicker empty state and leave `state='arena'`. (3) In the replay block (main.js:347-356), look up `shared.statId` first (validate it exists in the theme and its `n` matches the URL `n`), fall back to exact-match only when absent, and require a non-null stat before transitioning.
→ Closes **#2, #5, #6, #7** and resolves **INV-5 UNMET, INV-6 PARTIAL, DOD-5, DOD-6** in one coherent change (they are all the same resolver+ordering defect viewed from different params).

**Fix C — Unify the dot-count clamp across reveal and share into one helper, fail loud on bad n.**
Extract `clampN(n) = Math.max(0, Math.min(100, Math.round(n)))`; use it in both reveal.js:60 and share.js:89; in `generateShareCard`, throw/abort (no card emitted) when `stat.n` is not finite instead of defaulting to 0.
→ Closes **#3**, resolves **INV-4 PARTIAL / DOD-4**, and makes the two grids provably byte-identical.

**Fix D — Make the silhouette sampler conserve the captured count.**
In `sampleAlongPaths` `remaining<0` branch, allocate dots greedily to exactly `dotsForPaths` (one-at-a-time, longest-path-first) instead of uniform `perPath`; add an assertion `positions.length === min(count, capacity)` exercised across all shapes × counts 1..100 (fold into Fix A's script).
→ Closes **#4** — the one HIGH the invariant lens structurally missed.

**Fix E — Body-corroboration copy pass (mh_01, mh_13, wg_01, he_14).**
Restate each headline figure in its body (or re-anchor the headline to the body's actual framing); for mh_01 reconcile lifetime vs point prevalence to a single consistent number.
→ Closes **#8, #9, #13**, lifts **INV-2 / DOD-2** to MET.

**Fix F — Geometry robustness batch (lower priority, off the truth axis).**
Clamp `scalePaths` size to `Math.max(0, …)` (#11); reject zero-area lassos by signed-area epsilon (#12); guard resize rescale and skip 0-dim (#10); store+clear the outline/anim interval ids and clear arena constraint on the challenge-continue path (#14, #15).
→ Closes **#10, #11, #12, #14, #15**.

**Fix G — Deploy/infra hygiene (cheap, independent).**
Absolute `og:image` URL + remove orphan `preview.png` (#17); add `vercel.json` with CSP/nosniff/Referrer-Policy (#16); guard analytics `inject()` behind `import.meta.env.PROD` (#19); add `universal` glyph or document grid fallback (#18); rebuild/delete stale dist, wire-or-delete `#count-badge`, align climate glyphs (#20).
→ Closes **#16-#20**.

Doing **A + B + C** alone resolves every CRITICAL and HIGH on the statistical-truth axis except the silhouette dot-drop, which **D** then closes. A through D is the dependability-critical set; E elevates one PARTIAL invariant to clean; F and G are robustness and polish.
