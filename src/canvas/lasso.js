/**
 * lasso.js — Freeform lasso drawing tool (mouse + touch)
 */

const CLOSE_THRESHOLD = 'ontouchstart' in window ? 65 : 40; // px — larger on touch for finger precision

export function initLasso(canvas, circles) {
  let path = null;
  let drawing = false;
  let isClosed = false; // true when user draws back near start point

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function distBetween(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onStart(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    drawing = true;
    isClosed = false;
    path = [getPos(e)];
    canvas.dispatchEvent(new CustomEvent('lasso:drawstart'));
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    path.push(getPos(e));

    // Check if user has drawn back near start point (sticky — once closed, stay closed)
    if (!isClosed && path.length > 10) {
      isClosed = distBetween(path[0], path[path.length - 1]) < CLOSE_THRESHOLD;
    }

    // Live constraint: treat the path as a barrier while drawing
    if (path.length > 5) {
      for (let i = 0; i < circles.length; i++) {
        deflectFromPath(circles[i], path);
      }
    }
  }

  function onEnd(e) {
    if (!drawing) return;
    drawing = false;
    canvas.dispatchEvent(new CustomEvent('lasso:drawend'));
    if (!path || path.length < 3) { path = null; return; }

    // Check closure on the raw path before simplification.
    // First try the endpoint; if that fails, scan backwards to find
    // where the path last passed near the start (handles overshooting).
    isClosed = distBetween(path[0], path[path.length - 1]) < CLOSE_THRESHOLD;

    if (!isClosed && path.length > 20) {
      for (let i = path.length - 1; i >= 10; i--) {
        if (distBetween(path[0], path[i]) < CLOSE_THRESHOLD) {
          path = path.slice(0, i + 1);
          isClosed = true;
          break;
        }
      }
    }

    if (!isClosed) {
      path = null;
      return;
    }

    // Simplify dense mouse path to avoid ray-casting floating-point errors
    path = simplifyPath(path, 3);
    if (path.length < 3) { path = null; return; }

    // Snap last point to first for a clean close
    path[path.length - 1] = { ...path[0] };

    const capturedIndices = [];
    for (let i = 0; i < circles.length; i++) {
      if (pointInPolygon(circles[i].x, circles[i].y, path)) {
        capturedIndices.push(i);
      }
    }

    canvas.dispatchEvent(new CustomEvent('lasso:complete', {
      detail: { capturedCount: capturedIndices.length, capturedIndices },
    }));
  }

  function onCancel() {
    if (drawing) {
      drawing = false;
      isClosed = false;
      path = null;
      canvas.dispatchEvent(new CustomEvent('lasso:drawend'));
    }
  }

  // Push circles away from the drawn path segments (live barrier)
  function deflectFromPath(c, poly) {
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
        // Reflect velocity off the segment
        const dot = c.vx * nx + c.vy * ny;
        if (dot < 0) {
          c.vx -= 2 * dot * nx;
          c.vy -= 2 * dot * ny;
        }
      }
    }
  }

  // Ray-casting point-in-polygon
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

  function drawOverlay(ctx) {
    if (!path || path.length < 2) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const strokeColor = isDark ? 'rgba(160,130,100,0.8)' : 'rgba(181,134,42,0.75)';
    const fillColor   = isDark ? 'rgba(160,130,100,0.12)' : 'rgba(181,134,42,0.10)';
    const lineWidth   = window.innerWidth < 768 ? 2.5 : 1.5;

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);

    // Stroke the drawn path (no auto-close segment)
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Only fill when the user drew back near their start point (closed loop)
    if (isClosed) {
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    // While drawing, show a snap indicator at start point when close enough to close
    if (drawing && path.length > 10) {
      const nearStart = distBetween(path[0], path[path.length - 1]) < CLOSE_THRESHOLD;
      if (nearStart) {
        ctx.beginPath();
        ctx.arc(path[0].x, path[0].y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.stroke();
      }
    }
  }

  const onKeyDown = e => e.key === 'Escape' && onCancel();
  canvas.addEventListener('mousedown',  onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onEnd);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('touchmove',  onMove,  { passive: false });
  document.addEventListener('touchend',   onEnd);
  document.addEventListener('keydown', onKeyDown);

  return {
    drawOverlay,
    getPath() { return path ? [...path] : null; },
    clearPath() { path = null; drawing = false; isClosed = false; },
    destroy() {
      canvas.removeEventListener('mousedown',  onStart);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onEnd);
      canvas.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove',  onMove);
      document.removeEventListener('touchend',   onEnd);
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}

// Ramer-Douglas-Peucker path simplification
function simplifyPath(points, tolerance) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const lenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    let dist;
    if (lenSq === 0) {
      const ex = points[i].x - first.x, ey = points[i].y - first.y;
      dist = Math.sqrt(ex * ex + ey * ey);
    } else {
      const t = Math.max(0, Math.min(1, ((points[i].x - first.x) * dx + (points[i].y - first.y) * dy) / lenSq));
      const px = first.x + t * dx, py = first.y + t * dy;
      const ex = points[i].x - px, ey = points[i].y - py;
      dist = Math.sqrt(ex * ex + ey * ey);
    }
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}
