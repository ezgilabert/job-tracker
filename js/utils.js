// ============================================================
// Shared helpers
// ============================================================

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/**
 * Actualiza el placeholder del input de salario según:
 *   - moneda (ars / usd)
 *   - si el checkbox "es por hora" está tildado
 *
 * @param {HTMLInputElement} input
 * @param {HTMLInputElement} checkbox
 * @param {() => string} getCurrency  opcional; default 'usd'
 * @returns {() => void}  función para forzar el update manualmente
 */
export function bindHourlySalaryPlaceholder(input, checkbox, getCurrency = () => 'usd') {
  const update = () => {
    const cur = String(getCurrency() || 'usd').toLowerCase();
    const isHourly = checkbox.checked;

    let ph;
    if (cur === 'ars') {
      ph = isHourly ? 'Ej: 15.000–25.000' : 'Ej: 2.000.000–2.500.000';
    } else {
      ph = isHourly ? 'Ej: 20–30' : 'Ej: 3.000–4.000';
    }
    input.placeholder = ph;
  };

  checkbox.addEventListener('change', update);
  update();
  return update;
}

export function daysSince(fecha) {
  if (!fecha) return null;
  const iso = fecha.length === 10 ? fecha + 'T00:00:00' : fecha;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function formatDate(fecha) {
  if (!fecha) return '';
  const iso = fecha.length === 10 ? fecha + 'T00:00:00' : fecha;
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(fechaISO) {
  if (!fechaISO) return '';
  const d = new Date(fechaISO);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function highlightAndScroll(el, duration = 1800) {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('highlighted');
  void el.offsetWidth;
  el.classList.add('highlighted');
  setTimeout(() => el.classList.remove('highlighted'), duration);
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}