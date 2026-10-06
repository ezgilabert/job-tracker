// ============================================================
// DatePicker: custom date selector
// ============================================================

/**
 * Usage:
 *   const dp = new DatePicker(document.getElementById('miPicker'), {
 *     value: '2025-01-15',
 *     onChange: (iso) => console.log(iso),
 *   });
 *   dp.getValue(); // '2025-01-15'
 */
export class DatePicker {
  constructor(container, options = {}) {
    this.container = container;
    this.value = options.value || '';
    this.onChange = options.onChange || (() => {});
    this.viewMonth = this.value ? new Date(this.value + 'T00:00:00') : new Date();
    this.viewMonth.setDate(1);
    this.open = false;

    this.container.innerHTML = `
      <button type="button" class="date-trigger" data-trigger></button>
      <div class="date-popover" data-popover></div>
    `;

    this.trigger = this.container.querySelector('[data-trigger]');
    this.popover = this.container.querySelector('[data-popover]');

    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this._outsideClick = (e) => {
      if (this.open && !this.container.contains(e.target)) this.close();
    };
    document.addEventListener('click', this._outsideClick);

    this.popover.addEventListener('click', (e) => this._handlePopoverClick(e));

    this.renderTrigger();
  }

  destroy() {
    document.removeEventListener('click', this._outsideClick);
  }

  setValue(v) {
    this.value = v;
    if (v) {
      this.viewMonth = new Date(v + 'T00:00:00');
      this.viewMonth.setDate(1);
    }
    this.renderTrigger();
    if (this.open) this.renderPopover();
  }

  getValue() {
    return this.value;
  }

  toggle() {
    this.open ? this.close() : this.openPopover();
  }

  openPopover() {
    this.open = true;
    this.trigger.classList.add('open');
    this.popover.classList.add('open');
    this.renderPopover();
  }

  close() {
    this.open = false;
    this.trigger.classList.remove('open');
    this.popover.classList.remove('open');
  }

  renderTrigger() {
    if (this.value) {
      const d = new Date(this.value + 'T00:00:00');
      const txt = d.toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      this.trigger.classList.remove('empty');
      this.trigger.innerHTML = `<span>${txt}</span><span class="icon">📅</span>`;
    } else {
      this.trigger.classList.add('empty');
      this.trigger.innerHTML = `<span>Elegí una fecha</span><span class="icon">📅</span>`;
    }
  }

  renderPopover() {
    const year = this.viewMonth.getFullYear();
    const month = this.viewMonth.getMonth();
    const monthName = this.viewMonth.toLocaleDateString('es-AR', {
      month: 'long', year: 'numeric',
    });

    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    // ¿Estamos viendo el mes actual? En ese caso no se puede ir al siguiente.
    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();

    let daysHtml = '';

    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      daysHtml += `<button type="button" class="dp-day other-month" disabled>${day}</button>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = dateStr > todayStr;

      const classes = ['dp-day'];
      if (dateStr === todayStr) classes.push('today');
      if (dateStr === this.value) classes.push('selected');
      if (isFuture) classes.push('future');

      daysHtml += `<button type="button"
                           class="${classes.join(' ')}"
                           data-date="${dateStr}"
                           ${isFuture ? 'disabled' : ''}>${d}</button>`;
    }

    const totalCells = startWeekday + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      daysHtml += `<button type="button" class="dp-day other-month" disabled>${d}</button>`;
    }

    this.popover.innerHTML = `
      <div class="dp-header">
        <div class="dp-month">${monthName}</div>
        <div class="dp-nav">
          <button type="button" data-nav="prev" aria-label="Mes anterior">‹</button>
          <button type="button" data-nav="next" aria-label="Mes siguiente" ${isCurrentMonth ? 'disabled' : ''}>›</button>
        </div>
      </div>
      <div class="dp-weekdays">
        <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
      </div>
      <div class="dp-grid">${daysHtml}</div>
      <div class="dp-shortcuts">
        <button type="button" data-shortcut="today">Hoy</button>
        <button type="button" data-shortcut="-1">Ayer</button>
        <button type="button" data-shortcut="-7">-1 sem</button>
        <button type="button" data-shortcut="clear">Limpiar</button>
      </div>
    `;
  }

  _handlePopoverClick(e) {
    e.stopPropagation();

    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      if (navBtn.disabled) return;
      const dir = navBtn.dataset.nav === 'prev' ? -1 : 1;
      this.viewMonth.setMonth(this.viewMonth.getMonth() + dir);
      this.renderPopover();
      return;
    }

    const dayBtn = e.target.closest('.dp-day[data-date]');
    if (dayBtn) {
      if (dayBtn.disabled) return;
      const dateStr = dayBtn.dataset.date;
      this.setValue(dateStr);
      this.onChange(dateStr);
      this.close();
      return;
    }

    const shortcutBtn = e.target.closest('[data-shortcut]');
    if (shortcutBtn) {
      this._applyShortcut(shortcutBtn.dataset.shortcut);
    }
  }

  _applyShortcut(s) {
    if (s === 'clear') {
      this.setValue('');
      this.onChange('');
      this.close();
      return;
    }
    const d = new Date();
    if (s !== 'today') d.setDate(d.getDate() + parseInt(s, 10));
    const dateStr = d.toISOString().slice(0, 10);
    this.viewMonth = new Date(dateStr + 'T00:00:00');
    this.viewMonth.setDate(1);
    this.setValue(dateStr);
    this.onChange(dateStr);
    this.close();
  }
}