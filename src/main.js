/**
 * main.js — App entry point and state machine
 *
 * States: arena → lasso → theme-pick → reveal → post-reveal
 * Challenge mode: arena (stat pre-selected) → lasso → compare → reveal
 */

import { initArena }        from './canvas/arena.js'
import { initLasso }        from './canvas/lasso.js'
import { showThemePicker }  from './ui/themePicker.js'
import { playReveal }       from './ui/reveal.js'
import { initShare, parseShareParams } from './ui/share.js'
import { loadStats, findClosestStat }  from './data/loader.js'
import { getShape }                    from './data/silhouettes.js'
import { track }            from './analytics.js'

let state = 'arena';
let pendingCapture = null; // { capturedCount, capturedIndices, lassoPath }

// Challenge mode
let challengeMode     = false;
let challengeStat     = null;
let challengeThemeKey = null;

const canvas       = document.getElementById('arena-canvas');
const instruction  = document.getElementById('instruction');
const modeToggle   = document.getElementById('mode-toggle');
const challengeBtn = document.getElementById('challenge-btn');
const fogBtn       = document.getElementById('fog-btn');
const speedSlider  = document.getElementById('speed-slider');

// ── Cursor management ─────────────────────────────────────────────────────

function makeCircleCursor(isDark) {
  const stroke = isDark ? '#d4913a' : '#b5862a';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${stroke}" stroke-width="1.5"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 8 8, auto`;
}

function hoverCursor() {
  return makeCircleCursor(document.documentElement.getAttribute('data-theme') === 'dark');
}

function setHoverCursor()   { canvas.style.cursor = hoverCursor(); }
function setDefaultCursor() { canvas.style.cursor = ''; document.body.style.cursor = ''; }
function setDrawingCursor() { canvas.style.cursor = 'none'; document.body.style.cursor = 'none'; }

// Hover state (open circle) when mouse enters the canvas in arena state
canvas.addEventListener('mouseenter', () => {
  if (state === 'arena') setHoverCursor();
});
canvas.addEventListener('lasso:drawstart', () => {
  setDrawingCursor();
  arena.highlightCaptured([]);
  arena.clearConstraint();
});
canvas.addEventListener('lasso:drawend', () => {
  document.body.style.cursor = '';
  canvas.style.cursor = '';
});

// ── Bootstrap ──────────────────────────────────────────────────────────────

const stats   = loadStats();
const arena   = initArena(canvas);
const lasso   = initLasso(canvas, arena.circles);
arena.setOverlayDraw(lasso.drawOverlay);
initShare();

// ── Dark/light toggle ──────────────────────────────────────────────────────

modeToggle?.addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  // Update hover cursor color immediately if currently showing it
  if (state === 'arena' && canvas.style.cursor && canvas.style.cursor !== 'none') {
    setHoverCursor();
  }
});

// ── Speed (pace) ──────────────────────────────────────────────────────────

speedSlider?.addEventListener('input', () => {
  const v = parseInt(speedSlider.value, 10);
  const m = 0.15 + (v / 100) * 2.85;
  arena.setSpeedMultiplier(m);
  const readout = document.getElementById('pace-readout');
  if (readout) readout.textContent = m.toFixed(1) + '×';
});

// ── Fog mode ──────────────────────────────────────────────────────────────

let fogOn = false;
fogBtn?.addEventListener('click', () => {
  if (state !== 'arena') return;
  fogOn = !fogOn;
  fogBtn.classList.toggle('active', fogOn);
  fogBtn.setAttribute('aria-checked', String(fogOn));
  arena.setFogMode(fogOn);
  // Turn off challenge mode if fog is turned on
  if (fogOn && challengeMode) {
    challengeMode = false;
    challengeStat = null;
    challengeThemeKey = null;
    challengeBtn?.classList.remove('active');
    challengeBtn?.setAttribute('aria-checked', 'false');
    if (instruction) instruction.textContent = 'Draw around any number of dots.';
    if (instruction) instruction.classList.remove('challenge-mode', 'fade-out');
  }
});

// ── Challenge mode toggle ──────────────────────────────────────────────────

challengeBtn?.addEventListener('click', () => {
  if (state !== 'arena') return;
  challengeMode = !challengeMode;
  challengeBtn.classList.toggle('active', challengeMode);
  challengeBtn.setAttribute('aria-checked', String(challengeMode));

  // Turn off fog mode if challenge is turned on
  if (challengeMode && fogOn) {
    fogOn = false;
    fogBtn?.classList.remove('active');
    fogBtn?.setAttribute('aria-checked', 'false');
    arena.setFogMode(false);
  }

  if (challengeMode) {
    const themeKeys   = Object.keys(stats).filter(k => k !== 'universal');
    challengeThemeKey = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    const themeStats  = stats[challengeThemeKey].stats;
    challengeStat     = themeStats[Math.floor(Math.random() * themeStats.length)];
    const safeHeadline = challengeStat.headline.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
    const masked = safeHeadline.replace(/^\d+ in \d+/, '___ in 100');
    if (instruction) {
      instruction.innerHTML = masked + '<br><span class="instruction__sub">Draw to find the answer.</span>';
      instruction.classList.remove('fade-out');
      instruction.classList.add('challenge-mode');
    }
  } else {
    challengeStat = null;
    challengeThemeKey = null;
    if (instruction) {
      instruction.textContent = 'Draw around any number of dots.';
      instruction.classList.remove('challenge-mode', 'fade-out');
    }
  }
});

// ── Challenge: backdrop click to reset ────────────────────────────────────

document.getElementById('challenge-compare')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    window.location.reload();
  }
});

// ── Challenge: "See the full story" ───────────────────────────────────────

document.getElementById('challenge-continue-btn')?.addEventListener('click', () => {
  document.getElementById('challenge-compare')?.classList.add('hidden');
  if (challengeStat && challengeThemeKey && pendingCapture) {
    const stat  = challengeStat;
    const theme = challengeThemeKey;
    challengeMode     = false;
    challengeStat     = null;
    challengeThemeKey = null;
    challengeBtn?.classList.remove('active');
    handleThemeSelected(theme, stat, true);
  }
});

// ── Lasso complete ─────────────────────────────────────────────────────────

canvas.addEventListener('lasso:complete', ({ detail }) => {
  if (state !== 'arena') return;
  const { capturedCount, capturedIndices } = detail;
  const lassoPath = lasso.getPath();

  pendingCapture = { capturedCount, capturedIndices, lassoPath };
  arena.highlightCaptured(capturedIndices);
  setDefaultCursor();
  if (instruction) instruction.classList.add('fade-out');
  track('lasso_complete', { capturedCount });

  if (lassoPath) arena.setConstraint(lassoPath, capturedIndices);

  // Challenge mode: show count comparison overlay before reveal
  if (challengeMode && challengeStat) {
    state = 'reveal';
    if (instruction) instruction.classList.add('hidden');
    const diff = Math.abs(capturedCount - challengeStat.n);
    const questionEl  = document.getElementById('challenge-question');
    const userCountEl = document.getElementById('challenge-user-count');
    const answerEl    = document.getElementById('challenge-answer');
    const verdictEl   = document.getElementById('challenge-verdict');
    if (questionEl)  questionEl.textContent  = challengeStat.headline;
    if (userCountEl) userCountEl.textContent = capturedCount;
    if (answerEl)    answerEl.textContent    = challengeStat.n;
    if (verdictEl) {
      if (diff === 0)       verdictEl.textContent = 'Exactly right.';
      else if (diff <= 5)   verdictEl.textContent = 'So close.';
      else if (diff <= 20)  verdictEl.textContent = 'Did that surprise you?';
      else                  verdictEl.textContent = 'Way off — but now you know.';
    }
    document.getElementById('challenge-compare')?.classList.remove('hidden');
    return;
  }

  if (capturedCount === 100) {
    state = 'reveal';
    const stat = stats.universal.stats[0];
    window._shareData      = { theme: 'universal', capturedCount: 100, statId: stat.id };
    window._shareImageData = {
      stat,
      themeKey: 'universal',
      capturedCount: 100,
      lassoPath,
      circleSnapshots: capturedIndices.map(i => ({ x: arena.circles[i].x, y: arena.circles[i].y })),
      isDark: document.documentElement.getAttribute('data-theme') === 'dark',
    };
    arena.fadeOutUncaptured([]);
    playReveal({ stat, capturedCount: 100, capturedIndices, circles: arena.circles });
    return;
  }

  state = 'theme-pick';
  showThemePicker(stats, capturedCount);
});

// ── Theme selected ─────────────────────────────────────────────────────────

function handleThemeSelected(themeKey, preSelectedStat = null, fromChallenge = false) {
  if (!pendingCapture) return;
  state = 'reveal';

  const { capturedCount, capturedIndices, lassoPath } = pendingCapture;
  const themeStats = stats[themeKey]?.stats || [];
  const stat = preSelectedStat || findClosestStat(themeStats, capturedCount);
  if (!stat) return;

  window._shareData      = { theme: themeKey, capturedCount, statId: stat.id };
  window._shareImageData = {
    stat,
    themeKey,
    capturedCount,
    lassoPath: lassoPath || null,
    circleSnapshots: capturedIndices.map(i => ({ x: arena.circles[i].x, y: arena.circles[i].y })),
    isDark: document.documentElement.getAttribute('data-theme') === 'dark',
  };
  document.body.setAttribute('data-content-theme', themeKey);

  lasso.clearPath();
  arena.fadeOutUncaptured(capturedIndices);
  track('theme_selected', { theme: themeKey });

  const isMobile = window.innerWidth < 768;
  const shapeBounds = isMobile
    ? { x: 10, y: 50, width: window.innerWidth - 20, height: window.innerHeight * 0.35 - 40 }
    : { x: 150, y: 0, width: window.innerWidth / 2 - 150, height: window.innerHeight };
  const targetRadius = capturedCount > 0
    ? Math.min(isMobile ? 4 : 8, Math.max(isMobile ? 2.5 : 6, shapeBounds.width / (capturedCount * 0.8)))
    : (isMobile ? 3 : 6);
  const shape = getShape(themeKey, Math.max(capturedCount, 1), shapeBounds, targetRadius * 0.75);

  if (shape) {
    const accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#c47d18';
    let outlineAlpha = 0;

    arena.setOverlayDraw(ctx => {
      if (outlineAlpha < 0.01) return;
      ctx.save();
      ctx.globalAlpha = outlineAlpha;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      for (const subPath of shape.outline) {
        if (subPath.length < 2) continue;
        ctx.beginPath();
        subPath.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
      ctx.restore();
    });

    const fadeIn = setInterval(() => {
      outlineAlpha = Math.min(1, outlineAlpha + 0.06);
      if (outlineAlpha >= 1) clearInterval(fadeIn);
    }, 16);

    setTimeout(() => {
      const fadeOut = setInterval(() => {
        outlineAlpha = Math.max(0.15, outlineAlpha - 0.04);
        if (outlineAlpha <= 0.15) clearInterval(fadeOut);
      }, 16);
    }, 1800);

    arena.animateToPositions(capturedIndices, shape.positions, targetRadius);
  } else {
    arena.animateToPositions(capturedIndices, leftHalfPositions(capturedCount, shapeBounds), isMobile ? 4 : 6);
  }

  // Show correct count overlay in challenge mode
  const revealCount = document.getElementById('reveal-count');
  if (revealCount) {
    if (fromChallenge) {
      revealCount.textContent = stat.n;
      revealCount.classList.remove('hidden');
      setTimeout(() => revealCount.classList.add('visible'), 400);
    } else {
      revealCount.classList.add('hidden');
      revealCount.classList.remove('visible');
    }
  }

  playReveal({ stat, capturedCount, capturedIndices, circles: arena.circles });
}

function leftHalfPositions(count, bounds) {
  const side = Math.ceil(Math.sqrt(count));
  const cellW = (bounds.width * 0.6) / side;
  const cellH = (bounds.height * 0.6) / side;
  const ox = bounds.x + bounds.width * 0.2;
  const oy = bounds.y + bounds.height * 0.2;
  return Array.from({ length: count }, (_, i) => ({
    x: ox + (i % side) * cellW + cellW / 2,
    y: oy + Math.floor(i / side) * cellH + cellH / 2,
  }));
}

document.addEventListener('theme:selected', ({ detail }) => {
  if (state !== 'theme-pick') return;
  handleThemeSelected(detail.theme);
});


// ── Dismiss lasso (X button) — clear shape, keep balls ────────────────────

document.addEventListener('lasso:dismiss', () => {
  state = 'arena';
  pendingCapture = null;
  lasso.clearPath();
  arena.clearConstraint();
  arena.highlightCaptured([]);
  setHoverCursor();
  if (challengeMode && challengeStat) {
    const safeHeadline = challengeStat.headline.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
    const masked = safeHeadline.replace(/^\d+ in \d+/, '___ in 100');
    if (instruction) {
      instruction.innerHTML = masked + '<br><span class="instruction__sub">Draw to find the answer.</span>';
      instruction.classList.remove('fade-out');
    }
  }
});

// ── Shared link playback ───────────────────────────────────────────────────

const shared = parseShareParams();
if (shared.theme && shared.capturedCount !== null) {
  const safeCount = Math.max(0, Math.min(100, Math.floor(shared.capturedCount)));
  if (!isNaN(safeCount) && Object.keys(stats).includes(shared.theme)) {
    setTimeout(() => {
      const fakeIndices = Array.from({ length: safeCount }, (_, i) => i);
      pendingCapture = { capturedCount: safeCount, capturedIndices: fakeIndices, lassoPath: null };
      handleThemeSelected(shared.theme);
    }, 500);
  }
}
