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

export function diasDesde(fecha) {
  if (!fecha) return null;
  const iso = fecha.length === 10 ? fecha + 'T00:00:00' : fecha;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function formatFecha(fecha) {
  if (!fecha) return '';
  const iso = fecha.length === 10 ? fecha + 'T00:00:00' : fecha;
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
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
  void el.offsetWidth; // force reflow so the highlight animation restarts
  el.classList.add('highlighted');
  setTimeout(() => el.classList.remove('highlighted'), duration);
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}