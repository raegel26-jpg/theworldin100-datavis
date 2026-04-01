/**
 * reveal.js — Reveal animation sequence
 */

// Cancel pending timers from any previous reveal so a fast restart
// cannot apply stale class changes to a freshly-reset panel.
let _pendingRevealTimers = [];

export function playReveal({ stat, capturedCount, capturedIndices, circles }) {
  // Clear any in-flight timers from a previous call
  _pendingRevealTimers.forEach(id => clearTimeout(id));
  _pendingRevealTimers = [];

  const panel       = document.getElementById('reveal-panel');
  const instruction = document.getElementById('instruction');
  if (instruction) instruction.classList.add('hidden');
  const modesTray = document.getElementById('modes-tray');
  if (modesTray) modesTray.classList.add('hidden');
  const headline = document.getElementById('stat-headline');
  const body     = document.getElementById('stat-body');
  const source   = document.getElementById('stat-source');
  const readmore = document.getElementById('stat-readmore');
  const dotRatio = document.getElementById('dot-ratio');

  const safeHeadline = stat.headline.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  headline.innerHTML = safeHeadline.replace(/^(\d+ in \d+)(.*)/, '<em>$1</em><span class="stat-headline__rest">$2</span>');
  body.textContent     = stat.body;
  source.textContent   = stat.source;
  if (stat.sourceUrl) {
    readmore.href = stat.sourceUrl;
    readmore.style.display = '';
  } else {
    readmore.style.display = 'none';
  }

  panel.classList.remove('hidden', 'stat-visible', 'actions-visible');
  dotRatio.classList.remove('expanded');

  // Step 1 (0–400ms): uncaptured circles fade out — handled by arena.fadeOutUncaptured
  // Step 5 (2200ms): stat panel fades in
  _pendingRevealTimers.push(setTimeout(() => panel.classList.add('stat-visible'), 2200));

  // Step 7 (3400ms): dot ratio animates in — use stat.n (the real data point)
  _pendingRevealTimers.push(setTimeout(() => {
    renderDots(dotRatio, stat.n);
    dotRatio.classList.add('expanded');
  }, 3400));

  // Step 8 (4000ms): action buttons appear
  _pendingRevealTimers.push(setTimeout(() => panel.classList.add('actions-visible'), 4000));
}

function renderDots(container, statN) {
  // Clear any pending timers from a previous render
  if (container._dotTimers) {
    container._dotTimers.forEach(id => clearTimeout(id));
  }
  container._dotTimers = [];
  container.innerHTML = '';
  const safeN = Math.max(0, Math.min(100, Math.round(statN)));
  for (let i = 0; i < 100; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot-ratio__dot' + (i < safeN ? ' captured' : '');
    container.appendChild(dot);
    container._dotTimers.push(setTimeout(() => dot.classList.add('visible'), i * 10));
  }
}
