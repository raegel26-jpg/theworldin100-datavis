/**
 * themePicker.js — Theme selection overlay
 */

export function showThemePicker(stats, capturedCount) {
  const picker   = document.getElementById('theme-picker');
  const options  = document.getElementById('theme-options');

  const themes = Object.entries(stats).filter(([key, theme]) =>
    key !== 'universal' && theme.stats.some(s => s.n === capturedCount)
  );
  const shuffled = [...themes].sort(() => Math.random() - 0.5).slice(0, 3);

  options.innerHTML = '';

  if (shuffled.length === 0) {
    options.innerHTML = '<p class="theme-picker__empty">No stories match that number. Try drawing a different amount.</p>';
    picker.classList.remove('hidden');
    const closeBtn = document.getElementById('theme-picker-close');
    if (closeBtn) {
      const onClose = () => {
        picker.classList.add('hidden');
        closeBtn.removeEventListener('click', onClose);
        document.dispatchEvent(new CustomEvent('lasso:dismiss'));
      };
      closeBtn.addEventListener('click', onClose);
    }
    return;
  }

  const iconMap = {
    mental_health: `<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/>`,
    climate:       `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`,
    hunger:        `<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/>`,
    education:     `<path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`,
    health:        `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`,
    inequality:    `<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 21V7"/>`,
    social:        `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    work_life:     `<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a18.15 18.15 0 0 1-20 0"/>`,
    ai_tech:       `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/>`,
    women_girls:   `<circle cx="12" cy="9" r="6"/><path d="M12 15v7"/><path d="M9 19h6"/>`,
    children:      `<path d="M12 2l2.4 5.6 6.1.8-4.5 4.2 1.1 6.4L12 16l-5.1 3 1.1-6.4-4.5-4.2 6.1-.8L12 2z"/>`,
  };

  for (const [key, theme] of shuffled) {
    const card = document.createElement('button');
    card.className = 'theme-card';
    card.setAttribute('aria-label', theme.label);
    const iconPaths = iconMap[key] || '';
    card.innerHTML = `
      <svg class="theme-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths}</svg>
      <span class="theme-card__name">${theme.label}</span>
    `;
    card.addEventListener('click', () => {
      picker.classList.add('hidden');
      document.dispatchEvent(new CustomEvent('theme:selected', {
        detail: { theme: key },
      }));
    });
    options.appendChild(card);
  }

  // Wire close button — clears lasso shape only, keeps balls
  const closeBtn = document.getElementById('theme-picker-close');
  if (!closeBtn) return;
  const onClose = () => {
    picker.classList.add('hidden');
    closeBtn.removeEventListener('click', onClose);
    picker.removeEventListener('click', onBackdropClick);
    cleanup();
    document.dispatchEvent(new CustomEvent('lasso:dismiss'));
  };
  closeBtn.addEventListener('click', onClose);

  // Backdrop click to dismiss
  const onBackdropClick = (e) => {
    if (e.target === picker) onClose();
  };
  picker.addEventListener('click', onBackdropClick);

  // Make popup draggable
  const inner = picker.querySelector('.theme-picker__inner');
  if (!inner) return;
  inner.style.position = 'relative';
  inner.style.left = '';
  inner.style.top = '';
  let dragging = false, dragX = 0, dragY = 0, startLeft = 0, startTop = 0;

  function onDragStart(e) {
    // Don't drag if clicking a button/card, or on mobile (bottom sheet)
    if (e.target.closest('button')) return;
    if (window.innerWidth < 640) return;
    dragging = true;
    const src = e.touches ? e.touches[0] : e;
    dragX = src.clientX;
    dragY = src.clientY;
    startLeft = parseInt(inner.style.left) || 0;
    startTop = parseInt(inner.style.top) || 0;
    inner.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function onDragMove(e) {
    if (!dragging) return;
    const src = e.touches ? e.touches[0] : e;
    inner.style.left = (startLeft + src.clientX - dragX) + 'px';
    inner.style.top = (startTop + src.clientY - dragY) + 'px';
  }
  function onDragEnd() {
    dragging = false;
    inner.style.cursor = 'grab';
  }

  // Clean up window-level listeners to prevent stacking
  function cleanup() {
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);
  }

  inner.style.cursor = 'grab';
  inner.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  inner.addEventListener('touchstart', onDragStart, { passive: false });
  window.addEventListener('touchmove', onDragMove);
  window.addEventListener('touchend', onDragEnd);

  // Also clean up when a theme card is clicked
  for (const card of options.querySelectorAll('.theme-card')) {
    card.addEventListener('click', cleanup, { once: true });
  }

  picker.classList.remove('hidden');
}
