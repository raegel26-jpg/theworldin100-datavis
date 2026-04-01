/**
 * share.js — 1080×1080 image card generation for social sharing
 */

import { getShape } from '../data/silhouettes.js';

export function initShare() {
  const shareBtn    = document.getElementById('share-btn');
  const downloadBtn = document.getElementById('download-btn');
  const restartBtn  = document.getElementById('restart-btn');
  const toast       = document.getElementById('share-toast');

  // Share — Web Share API with link; fallback to copy link to clipboard
  shareBtn?.addEventListener('click', () => {
    const data = window._shareData;
    if (!data) return;

    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('t', data.theme);
    url.searchParams.set('n', data.capturedCount);
    if (data.statId) url.searchParams.set('s', data.statId);
    const shareUrl = url.toString();

    if (navigator.share) {
      navigator.share({
        title: 'World in 100',
        text: window._shareImageData?.stat?.headline || '',
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl)
          .then(() => showToast(toast, 'Link copied.'))
          .catch(() => showToast(toast, 'Could not share.'));
      });
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => showToast(toast, 'Link copied.'))
        .catch(() => showToast(toast, 'Copy failed.'));
    }
  });

  // Download — generate PNG and save
  downloadBtn?.addEventListener('click', () => {
    const data = window._shareImageData;
    if (!data) return;
    const fontTimeout = new Promise(resolve => setTimeout(resolve, 1500));
    Promise.race([
      Promise.all([
        document.fonts.load('600 96px "Gambetta"'),
        document.fonts.load('400 56px "Gambetta"'),
        document.fonts.load('500 22px "Karla"'),
      ]),
      fontTimeout,
    ]).then(() => {
      const card = generateShareCard(data);
      card.toBlob(blob => downloadPng(blob, toast), 'image/png');
    });
  });

  restartBtn?.addEventListener('click', () => window.location.reload());
}

function generateShareCard({ stat, isDark }) {
  const SIZE = 1080;
  const cv = document.createElement('canvas');
  cv.width = SIZE;
  cv.height = SIZE;
  const ctx = cv.getContext('2d');

  const bg     = isDark ? '#16171d' : '#eee8dc';
  const fg     = isDark ? '#f3f4f6' : '#1d2438';
  const accent = isDark ? '#d4913a' : '#c47d18';
  const fgSub  = isDark ? 'rgba(243,244,246,0.4)' : 'rgba(29,36,56,0.4)';
  const dotRem = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(29,36,56,0.12)';

  const PAD  = 88;
  const MID  = 560; // vertical divider between text and dot grid
  const textW = MID - PAD - 40; // max text width

  // dot grid config
  const DOT_D    = 14;  // dot diameter
  const DOT_GAP  = 6;
  const DOT_STEP = DOT_D + DOT_GAP;
  const GRID_W   = 10 * DOT_STEP - DOT_GAP; // 194px
  const GRID_H   = GRID_W;
  const gridX    = MID + (SIZE - PAD - MID - GRID_W) / 2; // centred in right col
  const gridCY   = SIZE / 2 + 20; // slightly below centre
  const gridY    = gridCY - GRID_H / 2;
  const statN    = typeof stat.n === 'number' ? stat.n : 0;

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ── Top-left project name ───────────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `500 21px "Karla", system-ui, sans-serif`;
  ctx.fillStyle = accent;
  ctx.fillText('The World in 100', PAD, PAD);

  // ── Dot ratio grid (right column, vertically centred) ───────────────────
  for (let i = 0; i < 100; i++) {
    const col = i % 10;
    const row = Math.floor(i / 10);
    ctx.fillStyle = i < statN ? accent : dotRem;
    ctx.beginPath();
    ctx.arc(
      gridX + col * DOT_STEP + DOT_D / 2,
      gridY + row * DOT_STEP + DOT_D / 2,
      DOT_D / 2, 0, Math.PI * 2
    );
    ctx.fill();
  }

  // ── Headline (left column, vertically centred) ───────────────────────────
  const bigSize  = 84;
  const restSize = 40;
  const lineH    = restSize * 1.05;

  // measure wrapped rest to find total text block height
  const headlineMatch = stat.headline.match(/^(\d+ in \d+)(.*)/);
  const bigPart  = headlineMatch ? headlineMatch[1] : stat.headline;
  const restPart = headlineMatch ? headlineMatch[2].trimStart() : '';

  ctx.font = `400 ${restSize}px "Gambetta", Georgia, serif`;
  const restLines = restPart ? wrapText(ctx, restPart, textW) : [];
  const blockH = bigSize * 0.95 + 18 + restLines.length * lineH;

  let ty = SIZE / 2 - blockH / 2 + 20; // slight downward nudge to feel optically centred
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (headlineMatch) {
    ctx.font = `600 ${bigSize}px "Gambetta", Georgia, serif`;
    ctx.fillStyle = accent;
    ctx.fillText(bigPart, PAD, ty);
    ty += bigSize * 0.95 + 18;

    ctx.font = `400 ${restSize}px "Gambetta", Georgia, serif`;
    ctx.fillStyle = fg;
    for (const line of restLines) {
      ctx.fillText(line, PAD, ty);
      ty += lineH;
    }
  } else {
    ctx.font = `600 ${bigSize}px "Gambetta", Georgia, serif`;
    ctx.fillStyle = fg;
    for (const line of wrapText(ctx, stat.headline, textW)) {
      ctx.fillText(line, PAD, ty);
      ty += bigSize * 1.0;
    }
  }

  // ── Source ──────────────────────────────────────────────────────────────
  ty += 14;
  ctx.font = `400 20px "Karla", system-ui, sans-serif`;
  ctx.fillStyle = fgSub;
  ctx.fillText(stat.source, PAD, ty);

  // ── Footer ──────────────────────────────────────────────────────────────
  ctx.textBaseline = 'bottom';
  ctx.font = `400 19px "Karla", system-ui, sans-serif`;
  ctx.fillStyle = fgSub;
  ctx.textAlign = 'left';
  ctx.fillText('theworldin100.vercel.app', PAD, SIZE - PAD);
  ctx.textAlign = 'right';
  ctx.fillText('A PROJECT BY @RAEGELNOTRACHEL', SIZE - PAD, SIZE - PAD);

  return cv;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let curr = '';
  for (const word of words) {
    const test = curr ? curr + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && curr) {
      lines.push(curr);
      curr = word;
    } else {
      curr = test;
    }
  }
  if (curr) lines.push(curr);
  return lines;
}


function downloadPng(blob, toast) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'world-in-100.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(toast, 'Image saved.');
}

function showToast(toast, message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden', 'fade-out');
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.classList.add('hidden'), 250);
  }, 2500);
}

export function parseShareParams() {
  const p = new URLSearchParams(window.location.search);
  const rawN = p.has('n') ? parseInt(p.get('n'), 10) : null;
  return {
    theme:         p.get('t') || null,
    capturedCount: rawN !== null && !isNaN(rawN) ? rawN : null,
    statId:        p.get('s') || null,
  };
}
