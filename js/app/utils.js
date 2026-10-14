// ============================================================
// Shared helpers
// ============================================================

import { getLanguage } from '../i18n/index.js';

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

// ------------------------------------------------------------
// Date formatting — locale-aware.
// ------------------------------------------------------------
function currentLocale() {
  return getLanguage() === 'en' ? 'en-US' : 'es-AR';
}

export function daysSince(date) {
  if (!date) return null;
  const iso = date.length === 10 ? date + 'T00:00:00' : date;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function formatDate(date) {
  if (!date) return '';
  const iso = date.length === 10 ? date + 'T00:00:00' : date;
  return new Date(iso).toLocaleDateString(currentLocale(), {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(currentLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns the local YYYY-MM-DD string for a given Date.
 * Uses the timezone offset so the result matches the user's
 * calendar day, not the UTC day.
 */
export function toLocalISO(date = new Date()) {
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 10);
}

export function todayISO() {
  return toLocalISO(new Date());
}

/**
 * Monotonic ID generator.
 *
 * Uses Date.now() as the base, and bumps by 1 whenever the
 * previous call happened in the same millisecond. This
 * guarantees unique, strictly increasing numbers even when the
 * generator is called in a tight loop. Suitable for the local,
 * single-user model of the app.
 */
let _lastUid = 0;
export function uid() {
  const now = Date.now();
  _lastUid = now > _lastUid ? now : _lastUid + 1;
  return _lastUid;
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

/**
 * Reads and trims the value of an input/textarea by DOM id.
 * Returns '' when the element does not exist.
 */
export function valueOf(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/**
 * Writes a value into an input/textarea by DOM id.
 * Safe no-op when the element is missing.
 */
export function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? '';
}

// ------------------------------------------------------------
// Store mutation helpers
// ------------------------------------------------------------

/**
 * Applies a patch function to the item with the given id inside
 * a store. No-op if the item doesn't exist.
 *
 * Replaces the ubiquitous:
 *
 *   store.update(items => items.map(it =>
 *     it.id === id ? { ...it, ...patch } : it
 *   ));
 *
 * @param {import('./store.js').Store} store
 * @param {number|string} id
 * @param {(item: object) => object} patchFn
 */
export function updateById(store, id, patchFn) {
  store.update(items => items.map(it =>
    it.id === id ? patchFn(it) : it
  ));
}

/**
 * Returns a shallow copy of `item` with a new history entry
 * appended. The entry always gets a `date` (ISO string) — the
 * caller only supplies the rest of the fields.
 *
 * Replaces the ubiquitous:
 *
 *   const history = cloneArray(item.history);
 *   history.push({ status, date: new Date().toISOString(), ...rest });
 *   return { ...item, status, history };
 *
 * @param {object} item        item with a `.history` array
 * @param {object} patch       properties to merge into the item
 * @param {object} entry       history entry payload (without date)
 * @returns {object}
 */
export function withHistoryEntry(item, patch, entry) {
  const history = Array.isArray(item.history) ? [...item.history] : [];
  history.push({ date: new Date().toISOString(), ...entry });
  return { ...item, ...patch, history };
}