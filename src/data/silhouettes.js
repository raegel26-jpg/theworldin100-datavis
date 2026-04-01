/**
 * silhouettes.js — Shape outlines + dot positions for theme shapes
 * Uses Lucide SVG path data parsed at runtime.
 *
 * getShape(themeKey, count, bounds) → { outline: Array<Array<{x,y}>>, positions: Array<{x,y}> }
 *   outline   — array of sub-paths for drawing the dashed guide
 *   positions — evenly-sampled dot positions along the outline
 */

// ── SVG Path Parser ───────────────────────────────────────────────────────

function circleToPoints(c, steps = 64) {
  const { cx, cy, r } = c;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function parseSVGPaths(pathStrings, viewBox, rects, circles) {
  const allPaths = [];
  for (const d of pathStrings) {
    const pts = parseSinglePath(d);
    if (pts.length > 1) allPaths.push(pts);
  }
  if (rects) {
    for (const r of rects) allPaths.push(rectToPoints(r));
  }
  if (circles) {
    for (const c of circles) allPaths.push(circleToPoints(c));
  }
  const [vx, vy, vw, vh] = viewBox;
  return allPaths.map(path =>
    path.map(p => ({ x: (p.x - vx) / vw, y: (p.y - vy) / vh }))
  );
}

function rectToPoints(r) {
  const { x, y, width: w, height: h, rx: cr } = r;
  const rx = cr || 0;
  const pts = [];
  const steps = 8;
  pts.push({ x: x + rx, y });
  pts.push({ x: x + w - rx, y });
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push({ x: x + w - rx + rx * Math.cos(a), y: y + rx + rx * Math.sin(a) });
  }
  pts.push({ x: x + w, y: y + h - rx });
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push({ x: x + w - rx + rx * Math.cos(a), y: y + h - rx + rx * Math.sin(a) });
  }
  pts.push({ x: x + rx, y: y + h });
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push({ x: x + rx + rx * Math.cos(a), y: y + h - rx + rx * Math.sin(a) });
  }
  pts.push({ x, y: y + rx });
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (i / steps) * (Math.PI / 2);
    pts.push({ x: x + rx + rx * Math.cos(a), y: y + rx + rx * Math.sin(a) });
  }
  return pts;
}

function parseSinglePath(d) {
  const tokens = tokenize(d);
  const points = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let lastCmd = '', lastCpX = 0, lastCpY = 0;
  let i = 0;

  function next() { return parseFloat(tokens[i++]); }
  function hasNums() { return i < tokens.length && /^[-+.\d]/.test(tokens[i]); }

  while (i < tokens.length) {
    let cmd = tokens[i];
    if (/^[A-Za-z]$/.test(cmd)) { i++; } else { cmd = lastCmd; }
    const abs = cmd === cmd.toUpperCase();
    const c = cmd.toUpperCase();

    if (c === 'M') {
      let x = next(), y = next();
      if (!abs) { x += cx; y += cy; }
      cx = x; cy = y; sx = x; sy = y;
      points.push({ x: cx, y: cy });
      while (hasNums()) {
        x = next(); y = next();
        if (!abs) { x += cx; y += cy; }
        cx = x; cy = y;
        points.push({ x: cx, y: cy });
      }
    } else if (c === 'L') {
      while (hasNums()) {
        let x = next(), y = next();
        if (!abs) { x += cx; y += cy; }
        cx = x; cy = y;
        points.push({ x: cx, y: cy });
      }
    } else if (c === 'H') {
      while (hasNums()) {
        let x = next();
        if (!abs) x += cx;
        cx = x;
        points.push({ x: cx, y: cy });
      }
    } else if (c === 'V') {
      while (hasNums()) {
        let y = next();
        if (!abs) y += cy;
        cy = y;
        points.push({ x: cx, y: cy });
      }
    } else if (c === 'C') {
      while (hasNums()) {
        let x1=next(),y1=next(),x2=next(),y2=next(),x=next(),y=next();
        if (!abs) { x1+=cx;y1+=cy;x2+=cx;y2+=cy;x+=cx;y+=cy; }
        points.push(...cubicBez({x:cx,y:cy},{x:x1,y:y1},{x:x2,y:y2},{x,y},16).slice(1));
        lastCpX=x2; lastCpY=y2; cx=x; cy=y;
      }
    } else if (c === 'S') {
      while (hasNums()) {
        let x2=next(),y2=next(),x=next(),y=next();
        if (!abs) { x2+=cx;y2+=cy;x+=cx;y+=cy; }
        let x1 = 2*cx-lastCpX, y1 = 2*cy-lastCpY;
        if (!'CcSs'.includes(lastCmd)) { x1=cx; y1=cy; }
        points.push(...cubicBez({x:cx,y:cy},{x:x1,y:y1},{x:x2,y:y2},{x,y},16).slice(1));
        lastCpX=x2; lastCpY=y2; cx=x; cy=y;
      }
    } else if (c === 'Q') {
      while (hasNums()) {
        let x1=next(),y1=next(),x=next(),y=next();
        if (!abs) { x1+=cx;y1+=cy;x+=cx;y+=cy; }
        points.push(...quadBez({x:cx,y:cy},{x:x1,y:y1},{x,y},12).slice(1));
        lastCpX=x1; lastCpY=y1; cx=x; cy=y;
      }
    } else if (c === 'A') {
      while (hasNums()) {
        const rx=next(),ry=next(),rot=next(),large=next(),sweep=next();
        let x=next(),y=next();
        if (!abs) { x+=cx; y+=cy; }
        points.push(...arcToPoints(cx,cy,rx,ry,rot,large,sweep,x,y,24).slice(1));
        cx=x; cy=y;
      }
    } else if (c === 'Z') {
      if (Math.abs(cx-sx) > 0.01 || Math.abs(cy-sy) > 0.01) {
        points.push({ x: sx, y: sy });
      }
      cx = sx; cy = sy;
    }
    lastCmd = cmd;
  }
  return points;
}

function tokenize(d) {
  return d.match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
}

function cubicBez(p0, p1, p2, p3, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
    });
  }
  return pts;
}

function quadBez(p0, p1, p2, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({ x: u*u*p0.x + 2*u*t*p1.x + t*t*p2.x, y: u*u*p0.y + 2*u*t*p1.y + t*t*p2.y });
  }
  return pts;
}

function arcToPoints(x1, y1, rx, ry, rotation, largeArc, sweep, x2, y2, steps) {
  if (rx === 0 || ry === 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  const phi = rotation * Math.PI / 180, cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy, y1p = -sinPhi * dx + cosPhi * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = Math.max(0, rx*rx*ry*ry - rx*rx*y1p*y1p - ry*ry*x1p*x1p);
  const den = rx*rx*y1p*y1p + ry*ry*x1p*x1p;
  let sq = den > 0 ? Math.sqrt(num / den) : 0;
  if (largeArc === sweep) sq = -sq;
  const cxp = sq * rx * y1p / ry, cyp = -sq * ry * x1p / rx;
  const ccx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const ccy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  function ang(ux, uy, vx, vy) {
    const dot = ux*vx + uy*vy, len = Math.sqrt(ux*ux + uy*uy) * Math.sqrt(vx*vx + vy*vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  }
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dth > 0) dth -= 2 * Math.PI;
  if (sweep && dth < 0) dth += 2 * Math.PI;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = th1 + (i / steps) * dth;
    pts.push({ x: cosPhi * rx * Math.cos(t) - sinPhi * ry * Math.sin(t) + ccx,
               y: sinPhi * rx * Math.cos(t) + cosPhi * ry * Math.sin(t) + ccy });
  }
  return pts;
}

// ── Dot sampling along paths ──────────────────────────────────────────────

function sampleAlongPaths(pathArrays, totalCount) {
  const validPaths = [];
  const pointDots = [];
  for (const pts of pathArrays) {
    if (pts.length < 1) continue;
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    if (len > 0.5) {
      validPaths.push({ pts, len });
    } else {
      pointDots.push({ x: pts[0].x, y: pts[0].y });
    }
  }

  const dotsForPoints = Math.min(pointDots.length, totalCount);
  const dotsForPaths = totalCount - dotsForPoints;
  const totalLen = validPaths.reduce((s, p) => s + p.len, 0);
  const result = [...pointDots.slice(0, dotsForPoints)];

  if (totalLen === 0 || dotsForPaths < 1) return result.slice(0, totalCount);

  let remaining = dotsForPaths - validPaths.length * 2;
  if (remaining < 0) {
    // Fewer dots than 2-per-path minimum — distribute 1 per path until exhausted
    const perPath = Math.max(1, Math.floor(dotsForPaths / validPaths.length));
    for (const { pts } of validPaths) result.push(...sampleSinglePath(pts, perPath));
    return result.slice(0, totalCount);
  }

  // Largest-remainder method: guarantees assignments sum exactly to dotsForPaths
  const raw    = validPaths.map(p => remaining * p.len / totalLen);
  const floors = raw.map(v => Math.floor(v));
  let deficit  = remaining - floors.reduce((a, b) => a + b, 0);
  raw.map((v, i) => ({ i, frac: v - floors[i] }))
     .sort((a, b) => b.frac - a.frac)
     .forEach(({ i }) => { if (deficit-- > 0) floors[i]++; });

  for (let i = 0; i < validPaths.length; i++) {
    result.push(...sampleSinglePath(validPaths[i].pts, 2 + floors[i]));
  }
  return result.slice(0, totalCount);
}

function sampleSinglePath(pts, n) {
  if (pts.length < 2 || n < 1) return [];
  const segs = [];
  let totalLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { segs.push({ from: pts[i-1], to: pts[i], len }); totalLen += len; }
  }
  if (totalLen === 0) return [];
  const spacing = totalLen / n;
  const result = [];
  for (let i = 0; i < n; i++) {
    const target = i * spacing;
    let walked = 0;
    for (const seg of segs) {
      if (walked + seg.len >= target) {
        const t = (target - walked) / seg.len;
        result.push({ x: seg.from.x + t * (seg.to.x - seg.from.x), y: seg.from.y + t * (seg.to.y - seg.from.y) });
        break;
      }
      walked += seg.len;
    }
  }
  return result;
}

// ── Shape data (Lucide SVG icons) ─────────────────────────────────────────

const SVG_SHAPES = {
  mental_health: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 18V5",
      "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",
      "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",
      "M17.997 5.125a4 4 0 0 1 2.526 5.77",
      "M18 18a4 4 0 0 0 2-7.464",
      "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",
      "M6 18a4 4 0 0 1-2-7.464",
      "M6.003 5.125a4 4 0 0 0-2.526 5.77",
    ],
  },
  health: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    ],
  },
  social: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
      "M22 21v-2a4 4 0 0 0-3-3.87",
      "M16 3.13a4 4 0 0 1 0 7.75",
    ],
    circles: [{ cx: 9, cy: 7, r: 4 }],
  },
  hunger: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5",
      "M8.5 8.5v.01",
      "M16 15.5v.01",
      "M12 12v.01",
      "M11 17v.01",
      "M7 14v.01",
    ],
  },
  work_life: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 12h.01",
      "M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
      "M22 13a18.15 18.15 0 0 1-20 0",
    ],
    rects: [{ x: 2, y: 6, width: 20, height: 14, rx: 2 }],
  },
  climate: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 2v2",
      "m4.93 4.93 1.41 1.41",
      "M20 12h2",
      "m19.07 4.93-1.41 1.41",
      "M15.947 12.65a4 4 0 0 0-5.925-4.128",
      "M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z",
    ],
  },
  inequality: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M16 16s-1.5-2-4-2-4 2-4 2",
      "M9 9h.01",
      "M15 9h.01",
    ],
    circles: [
      { cx: 12, cy: 12, r: 10 },
    ],
  },
  women_girls: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 15v7",
      "M9 19h6",
    ],
    circles: [{ cx: 12, cy: 9, r: 6 }],
  },
  children: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 2l2.94 5.96L21 9.03l-4.5 4.38 1.06 6.2L12 16.64l-5.56 2.97 1.06-6.2L3 9.03l6.06-1.07L12 2z",
    ],
  },
  education: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 7v14",
      "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
    ],
  },
  ai_tech: {
    viewBox: [0, 0, 24, 24],
    paths: [
      "M12 20v2", "M12 2v2",
      "M17 20v2", "M17 2v2",
      "M7 20v2",  "M7 2v2",
      "M2 12h2",  "M20 12h2",
      "M2 17h2",  "M20 17h2",
      "M2 7h2",   "M20 7h2",
    ],
    rects: [
      { x: 4, y: 4, width: 16, height: 16, rx: 2 },
      { x: 8, y: 8, width: 8,  height: 8,  rx: 1 },
    ],
  },
};

// ── Scale helpers ─────────────────────────────────────────────────────────

function scalePaths(pathArrays, bounds) {
  const pad = 60;
  const w = bounds.width - pad * 2;
  const h = bounds.height - pad * 2;
  const size = Math.min(w, h);
  const ox = bounds.x + (bounds.width - size) / 2;
  const oy = bounds.y + (bounds.height - size) / 2;
  return pathArrays.map(pts => pts.map(p => ({ x: ox + p.x * size, y: oy + p.y * size })));
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns { outline: Array<Array<{x,y}>>, positions: Array<{x,y}> } in screen coords,
 * or null if no shape is defined for this theme.
 *   outline   — array of sub-paths for drawing the dashed guide
 *   positions — evenly-sampled dot target positions, inset from the outline
 *               so that rendered dots don't visually protrude beyond the shape
 */
export function getShape(themeKey, count, bounds, inset = 0) {
  const data = SVG_SHAPES[themeKey];
  if (!data) return null;
  const normalizedPaths = parseSVGPaths(data.paths, data.viewBox, data.rects, data.circles);
  const scaledPaths = scalePaths(normalizedPaths, bounds);
  let positions = sampleAlongPaths(scaledPaths, count);

  if (inset > 0) {
    positions = insetTowardCentroid(positions, scaledPaths, inset);
  }

  return {
    outline: scaledPaths,
    positions,
  };
}

/**
 * Nudge dot positions toward the shape centroid so rendered dots
 * (which have physical radius) don't protrude beyond the outline.
 */
function insetTowardCentroid(positions, allPaths, amount) {
  let cx = 0, cy = 0, total = 0;
  for (const path of allPaths) {
    for (const p of path) { cx += p.x; cy += p.y; total++; }
  }
  if (total === 0) return positions;
  cx /= total;
  cy /= total;

  return positions.map(p => {
    const dx = cx - p.x, dy = cy - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return p; // already at centroid
    const nudge = Math.min(amount, dist * 0.4); // never overshoot past 40% toward center
    return { x: p.x + (dx / dist) * nudge, y: p.y + (dy / dist) * nudge };
  });
}

export function getShapePositions(themeKey, count, bounds, inset = 0) {
  const shape = getShape(themeKey, count, bounds, inset);
  return shape ? shape.positions : null;
}
