/**
 * dots.js — single source of truth for mapping a stat's `n` to filled dots.
 *
 * The reveal grid and the share-card grid MUST clamp identically, or the same
 * stat can render two different "N in 100" pictures. Both call clampDotCount.
 */
export function clampDotCount(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
