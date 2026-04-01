/**
 * arena.js — Physics simulation for 100 floating circles
 */

const CIRCLE_COUNT = 100;
const SPEED_MIN = 0.3;
const SPEED_MAX = 1.2;
const RADIUS = 6;

export function initArena(canvas) {
  const ctx = canvas.getContext('2d');
  const circles = [];
  let overlayDraw = null;
  let animId = null;
  let fogMode = false;
  let speedMultiplier = 1;
  let mouseX = -9999, mouseY = -9999;
  let constraint = null; // { polygon, indices }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const oldW = parseFloat(canvas.style.width) || w;
    const oldH = parseFloat(canvas.style.height) || h;

    if (circles.length) {
      for (const c of circles) {
        c.x = c.x * (w / oldW);
        c.y = c.y * (h / oldH);
      }
    }

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initCircles() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < CIRCLE_COUNT; i++) {
      circles.push({
        x: RADIUS + Math.random() * (w - 2 * RADIUS),
        y: RADIUS + Math.random() * (h - 2 * RADIUS),
        vx: (Math.random() < 0.5 ? -1 : 1) * (SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)),
        vy: (Math.random() < 0.5 ? -1 : 1) * (SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)),
        r: RADIUS,
        captured: false,
        opacity: 1,
      });
    }
  }

  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function constrainToPolygon(c, poly) {
    if (pointInPolygon(c.x, c.y, poly)) return;

    // Find the closest edge and push the circle back inside
    let bestDist = Infinity;
    let bestNx = 0, bestNy = 0, bestPx = 0, bestPy = 0;

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const ax = poly[j].x, ay = poly[j].y;
      const bx = poly[i].x, by = poly[i].y;
      const ex = bx - ax, ey = by - ay;
      const len2 = ex * ex + ey * ey;
      if (len2 === 0) continue;
      let t = ((c.x - ax) * ex + (c.y - ay) * ey) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * ex, py = ay + t * ey;
      const dx = c.x - px, dy = c.y - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestPx = px; bestPy = py;
        // Edge normal (inward)
        bestNx = -ey; bestNy = ex;
        const nl = Math.sqrt(bestNx * bestNx + bestNy * bestNy);
        if (nl > 0) { bestNx /= nl; bestNy /= nl; }
      }
    }

    // Push circle to just inside the nearest edge
    c.x = bestPx + bestNx * (c.r + 0.5);
    c.y = bestPy + bestNy * (c.r + 0.5);

    // Make sure the normal points inward (toward polygon center)
    if (!pointInPolygon(c.x, c.y, poly)) {
      c.x = bestPx - bestNx * (c.r + 0.5);
      c.y = bestPy - bestNy * (c.r + 0.5);
      bestNx = -bestNx;
      bestNy = -bestNy;
    }

    // Reflect velocity off the edge normal
    const dot = c.vx * bestNx + c.vy * bestNy;
    if (dot < 0) {
      c.vx -= 2 * dot * bestNx;
      c.vy -= 2 * dot * bestNy;
    }
  }

  // Push uncaptured circles away from the lasso boundary segments
  function deflectFromBarrier(c, poly) {
    const minDist = c.r + 2;
    const minDist2 = minDist * minDist;
    for (let i = 1; i < poly.length; i++) {
      const ax = poly[i - 1].x, ay = poly[i - 1].y;
      const bx = poly[i].x, by = poly[i].y;
      const ex = bx - ax, ey = by - ay;
      const len2 = ex * ex + ey * ey;
      if (len2 === 0) continue;
      let t = ((c.x - ax) * ex + (c.y - ay) * ey) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * ex, py = ay + t * ey;
      const dx = c.x - px, dy = c.y - py;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < minDist2 && dist2 > 0) {
        const dist = Math.sqrt(dist2);
        const nx = dx / dist, ny = dy / dist;
        const push = minDist - dist;
        c.x += nx * push;
        c.y += ny * push;
        const dot = c.vx * nx + c.vy * ny;
        if (dot < 0) {
          c.vx -= 2 * dot * nx;
          c.vy -= 2 * dot * ny;
        }
      }
    }
  }

  function update() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      // Skip physics for circles animating to shape targets
      if (c.targetX !== undefined) continue;
      // Skip physics for circles being faded out
      if (c.targetOpacity === 0) continue;

      c.x += c.vx * speedMultiplier;
      c.y += c.vy * speedMultiplier;

      if (constraint && constraint.indexSet.has(i)) {
        constrainToPolygon(c, constraint.polygon);
      } else {
        // Deflect uncaptured dots off the lasso boundary
        if (constraint) deflectFromBarrier(c, constraint.polygon);
        if (c.x - c.r < 0)  { c.x = c.r;     c.vx =  Math.abs(c.vx); }
        if (c.x + c.r > w)  { c.x = w - c.r;  c.vx = -Math.abs(c.vx); }
        if (c.y - c.r < 0)  { c.y = c.r;     c.vy =  Math.abs(c.vy); }
        if (c.y + c.r > h)  { c.y = h - c.r;  c.vy = -Math.abs(c.vy); }
      }
    }

    // Circle-to-circle collisions (skip circles animating to targets)
    for (let i = 0; i < circles.length; i++) {
      if (circles[i].targetX !== undefined) continue;
      for (let j = i + 1; j < circles.length; j++) {
        if (circles[j].targetX !== undefined) continue;
        const a = circles[i];
        const b = circles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.r + b.r;
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) / 2;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const dot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          a.vx -= dot * nx;
          a.vy -= dot * ny;
          b.vx += dot * nx;
          b.vy += dot * ny;
        }
      }
    }
  }

  function draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim() || '#c084fc';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const baseColor = isDark ? 'rgba(156,163,175,0.55)' : 'rgba(107,99,117,0.5)';

    for (const c of circles) {
      if (c.opacity <= 0) continue;
      let alpha = c.opacity;
      if (fogMode && !c.captured) {
        const dist = Math.hypot(c.x - mouseX, c.y - mouseY);
        const t = Math.max(0, 1 - dist / 110);
        alpha *= (0.07 + 0.93 * t);
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = c.captured ? accent : baseColor;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (overlayDraw) overlayDraw(ctx);
  }

  function tick() {
    update();
    draw();
    animId = requestAnimationFrame(tick);
  }

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });
  canvas.addEventListener('touchmove', e => {
    if (!fogMode) return;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    mouseX = t.clientX - rect.left;
    mouseY = t.clientY - rect.top;
  });
  canvas.addEventListener('touchend', () => { if (fogMode) { mouseX = -9999; mouseY = -9999; } });

  resize();
  initCircles();
  tick();

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    circles,
    setOverlayDraw(fn) { overlayDraw = fn; },
    setFogMode(on) { fogMode = on; },
    setSpeedMultiplier(m) { speedMultiplier = m; },
    stop() {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      window.removeEventListener('resize', onResize);
    },
    highlightCaptured(indices) {
      const set = new Set(indices);
      for (let i = 0; i < circles.length; i++) {
        circles[i].captured = set.has(i);
      }
    },
    setConstraint(polygon, indices) {
      constraint = { polygon, indexSet: new Set(indices) };
    },
    clearConstraint() {
      constraint = null;
    },
    animateToPositions(indices, targets, newRadius) {
      // Store targets; physics loop will lerp toward them
      for (let i = 0; i < indices.length; i++) {
        const c = circles[indices[i]];
        if (i < targets.length) {
          c.targetX = targets[i].x;
          c.targetY = targets[i].y;
          c.targetR = newRadius || c.r;
          c.vx = 0;
          c.vy = 0;
        } else {
          // No shape slot — fade this dot out instead of leaving it stranded
          c.targetOpacity = 0;
          c.vx = 0;
          c.vy = 0;
        }
      }
      // Disable constraint so circles can move freely to targets
      constraint = null;

      let lerpId;
      lerpId = setInterval(() => {
        let done = true;
        for (const idx of indices) {
          const c = circles[idx];
          if (c.targetX === undefined) continue;
          const dx = c.targetX - c.x;
          const dy = c.targetY - c.y;
          const dr = c.targetR - c.r;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(dr) > 0.1) {
            c.x += dx * 0.06;
            c.y += dy * 0.06;
            c.r += dr * 0.06;
            c.vx = 0;
            c.vy = 0;
            done = false;
          } else {
            c.x = c.targetX;
            c.y = c.targetY;
            c.r = c.targetR;
            c.vx = 0;
            c.vy = 0;
            delete c.targetX;
            delete c.targetY;
            delete c.targetR;
          }
        }
        if (done) clearInterval(lerpId);
      }, 16);
    },
    fadeOutUncaptured(indices) {
      const set = new Set(indices);
      for (let i = 0; i < circles.length; i++) {
        if (!set.has(i)) {
          circles[i].targetOpacity = 0;
          circles[i].vx = 0;
          circles[i].vy = 0;
        }
      }
      // Animate opacity
      let fadeId;
      fadeId = setInterval(() => {
        let done = true;
        for (const c of circles) {
          if (c.targetOpacity === 0 && c.opacity > 0) {
            c.opacity = Math.max(0, c.opacity - 0.04);
            done = false;
          }
        }
        if (done) clearInterval(fadeId);
      }, 16);
    },
  };
}
