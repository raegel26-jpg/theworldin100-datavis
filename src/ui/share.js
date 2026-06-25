/**
 * share.js — 1080×1080 image card generation for social sharing
 */

import { getShape } from '../data/silhouettes.js';
import { clampDotCount } from '../data/dots.js';

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
        document.fonts.load('italic 400 32px "Gambetta"'),
        document.fonts.load('500 22px "Karla"'),
        document.fonts.load('600 22px "Karla"'),
      ]),
      fontTimeout,
    ]).then(() => {
      let card;
      try {
        card = generateShareCard(data);
      } catch (err) {
        showToast(toast, 'Could not generate image.');
        return;
      }
      card.toBlob(blob => downloadPng(blob, toast), 'image/png');
    });
  });

  restartBtn?.addEventListener('click', () => window.location.reload());
}

function generateShareCard({ stat, isDark, themeLabel, figNo }) {
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
  // Fail loud rather than paint a self-contradicting "0 in 100" card. Uses the
  // same clamp as the reveal grid (dots.js) so the two surfaces never diverge.
  if (!Number.isFinite(stat.n)) {
    throw new Error(`share card: non-finite stat.n for ${stat.id}`);
  }
  const statN    = clampDotCount(stat.n);

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

  // ── Dot grid caption ─────────────────────────────────────────────────────
  const isFig = /^\d+\s+in\s+100\s+/.test(stat.headline);
  if (isFig) {
    ctx.font = `italic 400 22px "Gambetta", Georgia, serif`;
    ctx.fillStyle = fgSub;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${statN} of every 100`, gridX + GRID_W / 2, gridY + GRID_H + 26);
    ctx.textAlign = 'left';
  }

  // ── Editorial text block (eyebrow · figure · deck · body · source) ────────
  const figureSize  = 150;
  const unitSize    = 40;
  const deckSize    = 46;
  const deckLineH   = deckSize * 1.08;
  const bodySize    = 22;
  const bodyLineH   = bodySize * 1.4;
  const sourceSize  = 22;
  const eyebrowSize = 20;

  // Split "N in 100 <deck>" into a display figure + deck clause; the lone
  // universal stat has no prefix, so it falls back to a plain serif headline.
  const fm = stat.headline.match(/^(\d+)\s+in\s+100\s+(.+)$/);
  const figText  = fm ? fm[1] : null;
  const deckText = fm ? fm[2] : stat.headline;

  ctx.font = `400 ${deckSize}px "Gambetta", Georgia, serif`;
  const deckLines = wrapText(ctx, deckText, textW);
  ctx.font = `400 ${bodySize}px "Karla", system-ui, sans-serif`;
  const bodyLines = stat.body ? wrapText(ctx, stat.body, textW) : [];

  const eyebrowH = eyebrowSize + 18 + 26;             // label → rule → gap
  const figureH  = figText ? figureSize * 0.80 + 16 : 0;
  const deckH    = deckLines.length * deckLineH;
  const bodyH    = bodyLines.length ? 24 + bodyLines.length * bodyLineH : 0;
  const sourceH  = 22 + sourceSize;
  const totalH   = eyebrowH + figureH + deckH + bodyH + sourceH;

  const minY = PAD + 56;
  const maxY = SIZE - PAD - 40;
  let ty = Math.max(minY, Math.min((SIZE - totalH) / 2, maxY - totalH));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // eyebrow: topic label + figure number, then a hairline rule
  ctx.font = `600 ${eyebrowSize}px "Karla", system-ui, sans-serif`;
  ctx.fillStyle = accent;
  ctx.letterSpacing = '3px';
  const topic = (themeLabel || '').toUpperCase();
  ctx.fillText(topic, PAD, ty);
  const topicW = ctx.measureText(topic).width;
  ctx.letterSpacing = '0px';
  if (figNo) {
    ctx.font = `400 ${eyebrowSize}px "Karla", system-ui, sans-serif`;
    ctx.fillStyle = fgSub;
    ctx.fillText(`FIG. ${figNo}`, PAD + topicW + 22, ty);
  }
  ty += eyebrowSize + 18;
  ctx.strokeStyle = isDark ? 'rgba(243,244,246,0.18)' : 'rgba(29,36,56,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, ty + 0.5);
  ctx.lineTo(MID - 40, ty + 0.5);
  ctx.stroke();
  ty += 26;

  // display figure: big "N" + "in 100" on a shared baseline
  if (figText) {
    const baseline = ty + figureSize * 0.80;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `600 ${figureSize}px "Gambetta", Georgia, serif`;
    ctx.fillStyle = accent;
    ctx.fillText(figText, PAD, baseline);
    const figW = ctx.measureText(figText).width;
    ctx.font = `400 ${unitSize}px "Gambetta", Georgia, serif`;
    ctx.fillStyle = fgSub;
    ctx.fillText('in 100', PAD + figW + 18, baseline);
    ctx.textBaseline = 'top';
    ty += figureSize * 0.80 + 16;
  }

  // deck — the clause after "N in 100" (or the full headline in fallback)
  ctx.font = `400 ${deckSize}px "Gambetta", Georgia, serif`;
  ctx.fillStyle = fg;
  for (const line of deckLines) {
    ctx.fillText(line, PAD, ty);
    ty += deckLineH;
  }

  // body (descriptor)
  if (bodyLines.length) {
    ty += 24;
    ctx.font = `400 ${bodySize}px "Karla", system-ui, sans-serif`;
    ctx.fillStyle = fgSub;
    for (const line of bodyLines) {
      ctx.fillText(line, PAD, ty);
      ty += bodyLineH;
    }
  }

  // source — italic serif footnote
  ty += 22;
  ctx.font = `italic 400 ${sourceSize}px "Gambetta", Georgia, serif`;
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
