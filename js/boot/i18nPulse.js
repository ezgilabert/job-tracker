// ============================================================
// Boot: cascade pulse on language change (Web Animations API).
//
//   - New text is applied BEFORE animating (no flash).
//   - Each element slides up 24px with a fade.
//   - 60ms stagger between elements, ordered by visual position.
//   - 550ms per element, capped at 450ms of accumulated delay.
//   - Respects prefers-reduced-motion.
//   - Cancels any running animation on the same element first.
// ============================================================

export function pulseI18nTexts() {
  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const all = document.querySelectorAll(
    '.container [data-i18n], .container [data-i18n-html]'
  );

  const visible = [];
  all.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) visible.push(el);
  });

  if (!visible.length) return;

  // Sort by visual position; 8px tolerance groups elements on the
  // same row.
  visible.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (Math.abs(ra.top - rb.top) > 8) return ra.top - rb.top;
    return ra.left - rb.left;
  });

  const STAGGER = 60;
  const MAX_STAGGER = 450;
  const DURATION = 550;

  visible.forEach((el, i) => {
    if (typeof el.getAnimations === 'function') {
      el.getAnimations().forEach(a => {
        try { a.cancel(); } catch (_) { /* noop */ }
      });
    }

    const delay = Math.min(i * STAGGER, MAX_STAGGER);
    el.style.willChange = 'opacity, transform';

    const anim = el.animate(
      [
        { opacity: 0, transform: 'translateY(24px)' },
        { opacity: 1, transform: 'translateY(0)'    },
      ],
      {
        duration: DURATION,
        delay,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none',
      }
    );

    const cleanup = () => { el.style.willChange = ''; };
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  });
}