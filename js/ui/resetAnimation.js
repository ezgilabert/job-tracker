// ============================================================
// ResetAnimation: overlay full-screen con anillo de progreso
// que se llena de 0% a 100%. Se usa al confirmar el reinicio
// de configuración.
// ============================================================

export class ResetAnimation {
  /**
   * @param {HTMLElement} overlayEl  contenedor .reset-overlay
   * @param {HTMLElement} contentEl  contenedor .reset-content (vacío)
   */
  constructor(overlayEl, contentEl) {
    this.overlay = overlayEl;
    this.content = contentEl;
  }

  /**
   * Muestra el overlay con la animación. Resuelve cuando termina.
   * @param {number} duration  ms totales de la animación
   */
  async run(duration = 2400) {
    if (!this.overlay || !this.content) return;

    this.content.innerHTML = this._buildMarkup();
    this.overlay.classList.add('active');
    this.overlay.classList.remove('fade-out');

    // Pequeño delay para que el HTML esté en el DOM antes
    // de arrancar el contador.
    await this._wait(50);
    this._startCounter(duration);

    await this._wait(duration);
  }

  /**
   * Deja el overlay tal cual (opaco) para hacer el reload
   * justo después sin que se vea un flash de la app vieja.
   */
  keepVisible() {
    // No hace nada; sólo documenta la intención.
    // El overlay queda opaco hasta que la página recargue.
  }

  /**
   * Oculta el overlay. Devuelve una promesa cuando termina el fade.
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
      <div class="reset-label">Reiniciando…</div>
      <div class="reset-sub">Aplicando valores por defecto</div>
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