// ============================================================
// DatePicker: custom date selector
// ============================================================

import { t, getLanguage } from '../../i18n/index.js';
import { toLocalISO } from '../../app/utils.js';
import { icon } from '../../templates/icon.js';
import { onI18nChanged } from '../../app/events.js';

// ------------------------------------------------------------
// Locale-aware helpers.
// The `Intl` locale id is derived from the current i18n language,
// so switching to English reformats the trigger date and the
// month header on the next render (the component re-renders on
// the `i18n-changed` event).
// ------------------------------------------------------------
function currentLocale() {
  return getLanguage() === 'en' ? 'en-US' : 'es-AR';
}

// Weekday initials per language. Index 0 = Monday.
// We don't use Intl.DateTimeFormat('narrow') because some locales
// return two-letter initials or single letters without separators
// that don't match the layout. Hardcoding keeps them short.
const WEEKDAY_LABELS = {
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

function weekdayLabels() {
  return WEEKDAY_LABELS[getLanguage()] || WEEKDAY_LABELS.es;
}

/**
 * Usage:
 *   const dp = new DatePicker(document.getElementById('myPicker'), {
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

    // Re-render the trigger on language change.
    this._unsubI18n = onI18nChanged(() => {
      this.renderTrigger();
      if (this.open) this.renderPopover();
    });

    this.renderTrigger();
  }

  destroy() {
    document.removeEventListener('click', this._outsideClick);
    if (this._unsubI18n) {
      this._unsubI18n();
      this._unsubI18n = null;
    }
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
    const iconHtml = icon('icon-calendar');
    if (this.value) {
      const d = new Date(this.value + 'T00:00:00');
      const txt = d.toLocaleDateString(currentLocale(), {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      this.trigger.classList.remove('empty');
      this.trigger.innerHTML = `<span>${txt}</span><span class="icon">${iconHtml}</span>`;
    } else {
      this.trigger.classList.add('empty');
      this.trigger.innerHTML = `<span>${t('dp.empty')}</span><span class="icon">${iconHtml}</span>`;
    }
  }

  renderPopover() {
    const year = this.viewMonth.getFullYear();
    const month = this.viewMonth.getMonth();
    const monthName = this.viewMonth.toLocaleDateString(currentLocale(), {
      month: 'long', year: 'numeric',
    });

    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalISO(today);

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

    const weekdays = weekdayLabels()
      .map(label => `<span>${label}</span>`)
      .join('');

    this.popover.innerHTML = `
      <div class="dp-header">
        <div class="dp-month">${monthName}</div>
        <div class="dp-nav">
          <button type="button" data-nav="prev" aria-label="Prev">‹</button>
          <button type="button" data-nav="next" aria-label="Next" ${isCurrentMonth ? 'disabled' : ''}>›</button>
        </div>
      </div>
      <div class="dp-weekdays">${weekdays}</div>
      <div class="dp-grid">${daysHtml}</div>
      <div class="dp-shortcuts">
        <button type="button" data-shortcut="today">${t('dp.today')}</button>
        <button type="button" data-shortcut="-1">${t('dp.yesterday')}</button>
        <button type="button" data-shortcut="-7">${t('dp.lastWeek')}</button>
        <button type="button" data-shortcut="clear">${t('dp.clear')}</button>
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

    // Use the local date so shortcuts don't shift by one day near
    // midnight in non-UTC timezones.
    const dateStr = toLocalISO(d);

    this.viewMonth = new Date(dateStr + 'T00:00:00');
    this.viewMonth.setDate(1);
    this.setValue(dateStr);
    this.onChange(dateStr);
    this.close();
  }
}