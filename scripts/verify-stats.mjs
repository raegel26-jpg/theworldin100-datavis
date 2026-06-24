#!/usr/bin/env node
/**
 * verify-stats.mjs — mechanical guard for the dataset + dot geometry.
 *
 * Run by `npm run verify` and in CI. Exits non-zero on any violation. This is
 * the gate the 2026-06-24 consolidated audit found missing: the "headline number
 * must equal stat.n" class had shipped six times with nothing but human review
 * between a bad edit and a viewer. Every check below was previously re-derived by
 * hand; now it runs on every change.
 *
 * Asserts:
 *  - leading integer of every "N in 100" headline === stat.n
 *  - every headline matches ^\d+ in \d+ (except the whitelisted universal stat)
 *  - every stat has a non-empty source and sourceUrl
 *  - every stat.n is an integer in 0..100
 *  - no duplicate stat ids (globally)
 *  - no two stats within a theme share an n (keeps count-based replay deterministic)
 *  - the iq_06 / at_05 "never used the internet" pair stays aligned
 *  - getShape() conserves the captured count: positions.length === count for every
 *    themed silhouette across counts 1..100 (regression guard for the sampler)
 */
import { loadStats } from '../src/data/loader.js';
import { getShape } from '../src/data/silhouettes.js';

const HEADLINE_WHITELIST = new Set(['universal_100']);
const errors = [];
const fail = (msg) => errors.push(msg);

const stats = loadStats();
const allStats = [];
for (const [themeKey, theme] of Object.entries(stats)) {
  for (const s of theme.stats) allStats.push({ ...s, themeKey });
}

// ── Per-stat invariants ──────────────────────────────────────────────────
for (const s of allStats) {
  const where = `${s.themeKey}/${s.id}`;
  if (!Number.isInteger(s.n) || s.n < 0 || s.n > 100) {
    fail(`${where}: n=${JSON.stringify(s.n)} is not an integer in 0..100`);
  }
  if (!s.source || !String(s.source).trim()) fail(`${where}: missing source`);
  if (!s.sourceUrl || !String(s.sourceUrl).trim()) fail(`${where}: missing sourceUrl`);

  if (HEADLINE_WHITELIST.has(s.id)) continue;
  const m = /^(\d+) in (\d+)/.exec(s.headline || '');
  if (!m) {
    fail(`${where}: headline does not match "N in N": ${JSON.stringify(s.headline)}`);
  } else if (Number(m[1]) !== s.n) {
    fail(`${where}: headline leading number ${m[1]} !== n ${s.n}`);
  }
}

// ── Uniqueness ───────────────────────────────────────────────────────────
const idCounts = {};
for (const s of allStats) idCounts[s.id] = (idCounts[s.id] || 0) + 1;
for (const [id, c] of Object.entries(idCounts)) if (c > 1) fail(`duplicate id "${id}" (${c}x)`);

for (const [themeKey, theme] of Object.entries(stats)) {
  const seen = new Map();
  for (const s of theme.stats) {
    if (seen.has(s.n)) fail(`theme "${themeKey}": duplicate n=${s.n} (${seen.get(s.n)} and ${s.id})`);
    else seen.set(s.n, s.id);
  }
}

// ── Aligned pair (same underlying fact: 2.6bn / one third offline) ─────────
const byId = Object.fromEntries(allStats.map(s => [s.id, s]));
if (byId.iq_06 && byId.at_05 && byId.iq_06.n !== byId.at_05.n) {
  fail(`aligned pair broken: iq_06 n=${byId.iq_06.n} !== at_05 n=${byId.at_05.n}`);
}

// ── Geometry: silhouette dot conservation ──────────────────────────────────
const bounds = { x: 0, y: 0, width: 600, height: 600 };
let geomThemes = 0;
for (const themeKey of Object.keys(stats)) {
  if (!getShape(themeKey, 10, bounds)) continue; // grid-fallback theme (e.g. universal)
  geomThemes++;
  for (let count = 1; count <= 100; count++) {
    const shape = getShape(themeKey, count, bounds);
    const got = shape ? shape.positions.length : 0;
    if (got !== count) {
      fail(`geometry: ${themeKey} count=${count} -> ${got} dots (expected ${count})`);
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`✗ verify-stats: ${errors.length} problem(s) across ${allStats.length} stats`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `✓ verify-stats: ${allStats.length} stats / ${Object.keys(stats).length} themes / ` +
  `${geomThemes} silhouettes — all checks passed`
);
