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

export function daysSince(date) {
  if (!date) return null;
  const iso = date.length === 10 ? date + 'T00:00:00' : date;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function formatDate(date) {
  if (!date) return '';
  const iso = date.length === 10 ? date + 'T00:00:00' : date;
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
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