// ============================================================
// ResetAnimation: full-screen overlay with a progress ring that
// fills from 0% to 100%. Used when the user confirms the config
// reset.
// ============================================================

export class ResetAnimation {
  /**
   * @param {HTMLElement} overlayEl  wrapper .reset-overlay
   * @param {HTMLElement} contentEl  wrapper .reset-content (empty)
   */
  constructor(overlayEl, contentEl) {
    this.overlay = overlayEl;
    this.content = contentEl;
  }

  /**
   * Shows the overlay with the animation. Resolves when it ends.
   * @param {number} duration  total animation duration in ms
   */
  async run(duration = 2400) {
    if (!this.overlay || !this.content) return;

    this.content.innerHTML = this._buildMarkup();
    this.overlay.classList.add('active');
    this.overlay.classList.remove('fade-out');

    // Small delay so the HTML is in the DOM before the counter starts.
    await this._wait(50);
    this._startCounter(duration);

    await this._wait(duration);
  }

  /**
   * Leaves the overlay opaque so a reload right after doesn't
   * flash the old app.
   */
  keepVisible() {
    // No-op; the overlay stays opaque until the page reloads.
  }

  /**
   * Hides the overlay. Resolves when the fade ends.
   */
  async hide(fadeMs = 400) {
    if (!this.overlay) return;
    this.overlay.classList.add('fade-out');
    await this._wait(fadeMs);
    this.overlay.classList.remove('active', 'fade-out');
  }

  // ----------------------------------------------------------
  // Internals
  // ----------------------------------------------------------
  _buildMarkup() {
    return `
      <div class="reset-ring">
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="reset-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#7c5cff"/>
              <stop offset="100%" stop-color="#c084fc"/>
            </linearGradient>
          </defs>
          <circle class="reset-ring-bg" cx="50" cy="50" r="45"/>
          <circle class="reset-ring-progress" cx="50" cy="50" r="45"/>
        </svg>
        <div class="reset-ring-percent" data-reset-percent>0%</div>
      </div>
      <div class="reset-label">Restarting…</div>
      <div class="reset-sub">Applying default values</div>
    `;
  }

  _startCounter(duration) {
    const el = this.content.querySelector('[data-reset-percent]');
    if (!el) return;

    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-in-out
      const eased = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      el.textContent = Math.round(eased * 100) + '%';

      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}