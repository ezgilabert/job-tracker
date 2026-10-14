// ============================================================
// i18n: public API + apply helpers.
//
// The dictionaries live in `js/i18n/es.js` and `js/i18n/en.js`.
// Every consumer imports from this file, so the split is
// transparent — no other module needs to change.
// ============================================================

import { es } from './es.js';
import { en } from './en.js';

// ------------------------------------------------------------
// Supported languages (metadata for the config picker)
// ------------------------------------------------------------
export const SUPPORTED_LANGS = [
  { id: 'es', label: 'Español', code: 'ES', hint: 'Interfaz en español' },
  { id: 'en', label: 'English', code: 'EN', hint: 'Interface in English' },
];

// ------------------------------------------------------------
// Dictionaries registry
// ------------------------------------------------------------
const translations = { es, en };

// ------------------------------------------------------------
// Public state
// ------------------------------------------------------------
let currentLang = 'es';

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (translations[lang]) currentLang = lang;
}

export const AVAILABLE_LANGS = Object.keys(translations);

// ------------------------------------------------------------
// Translation function with `{placeholder}` interpolation
// ------------------------------------------------------------
export function t(key, params = {}) {
  const dict = translations[currentLang] || translations.es;
  const fallback = translations.es;
  let raw = dict[key];
  if (raw === undefined) raw = fallback[key];
  if (raw === undefined) {
    console.warn('[i18n] Missing key:', key, '| lang:', currentLang);
    raw = key;
  }
  if (!params || Object.keys(params).length === 0) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined && params[k] !== null ? String(params[k]) : `{${k}}`
  );
}

// ------------------------------------------------------------
// Helpers for state labels
// ------------------------------------------------------------
export function tState(id)         { return t('state.' + id); }
export function tStateShort(id)    { return t('stateShort.' + id); }
export function tRefState(id)      { return t('refState.' + id); }
export function tRefStateShort(id) { return t('refStateShort.' + id); }

// ------------------------------------------------------------
// Apply translations to a DOM tree
// ------------------------------------------------------------
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // aria-label uses setAttribute because there is no reflected property
  // that plays well with all supported browsers (el.ariaLabel is newer).
  root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
  const docKey = document.documentElement.dataset.i18nTitleDoc;
  if (docKey) document.title = t(docKey);
  document.documentElement.lang = currentLang;
}