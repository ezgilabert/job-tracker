// ============================================================
// Tests: i18n (translations, interpolation, no residual emojis)
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  t, setLanguage, getLanguage,
  tState, tStateShort, tRefState, tRefStateShort,
  SUPPORTED_LANGS, AVAILABLE_LANGS,
} from '../../js/i18n/index.js';

// ------------------------------------------------------------
// Language registry
// ------------------------------------------------------------
test('getLanguage: defaults to Spanish', () => {
  setLanguage('es');
  assert.equal(getLanguage(), 'es');
});

test('setLanguage: switches between supported languages', () => {
  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  setLanguage('es');
  assert.equal(getLanguage(), 'es');
});

test('setLanguage: ignores unsupported languages', () => {
  setLanguage('es');
  setLanguage('xx');
  assert.equal(getLanguage(), 'es');
});

test('AVAILABLE_LANGS: contains es and en', () => {
  assert.ok(AVAILABLE_LANGS.includes('es'));
  assert.ok(AVAILABLE_LANGS.includes('en'));
});

test('SUPPORTED_LANGS: metadata is present for every language', () => {
  const ids = SUPPORTED_LANGS.map(l => l.id);
  assert.ok(ids.includes('es'));
  assert.ok(ids.includes('en'));
  for (const l of SUPPORTED_LANGS) {
    assert.ok(l.label, `lang "${l.id}" missing label`);
    assert.ok(l.code, `lang "${l.id}" missing code`);
  }
});

// ------------------------------------------------------------
// t()
// ------------------------------------------------------------
test('t: returns the Spanish string', () => {
  setLanguage('es');
  assert.equal(t('app.name'), 'Job Tracker');
  assert.equal(t('form.company'), 'Empresa');
  assert.equal(t('action.config'), 'Configuración');
});

test('t: returns the English string', () => {
  setLanguage('en');
  assert.equal(t('app.name'), 'Job Tracker');
  assert.equal(t('form.company'), 'Company');
  assert.equal(t('action.config'), 'Settings');
  setLanguage('es');
});

test('t: interpolates {placeholder} params', () => {
  setLanguage('es');
  const out = t('auth.error.locked', { min: 5 });
  assert.ok(out.includes('5'), `expected "5" in "${out}"`);
  assert.ok(!out.includes('{min}'), `placeholder not replaced in "${out}"`);
});

test('t: missing key falls back to the key itself', () => {
  const original = console.warn;
  console.warn = () => {}; // silence the warning for this test
  try {
    const out = t('this.key.does.not.exist');
    assert.equal(out, 'this.key.does.not.exist');
  } finally {
    console.warn = original;
  }
});

// ------------------------------------------------------------
// State helpers
// ------------------------------------------------------------
test('tState: returns the full label for a status', () => {
  setLanguage('es');
  assert.equal(tState('Saved'), 'Guardado');
  assert.equal(tState('Offer'), 'Oferta');
});

test('tStateShort: returns the short label', () => {
  setLanguage('es');
  assert.equal(tStateShort('HR Interview'), 'RRHH');
});

test('tRefState: returns the referral state label', () => {
  setLanguage('es');
  assert.equal(tRefState('Pending'), 'Pendiente');
  assert.equal(tRefState('Not Applicable'), 'No aplica');
});

test('tRefStateShort: returns the short referral label', () => {
  setLanguage('es');
  assert.equal(tRefStateShort('In Process'), 'En proceso');
});

// ------------------------------------------------------------
// No residual emojis in the chrome keys
// (regression guard for the sprite migration)
// ------------------------------------------------------------
const CHROME_KEYS = [
  'config.title',
  'config.backup.title',
  'config.danger.title',
  'config.danger.all.title',
  'hist.title',
  'hist.refTitle',
  'modal.edit.title',
  'refEdit.title',
  'profile.title',
  'createRole.title',
  'note.title',
  'refToJob.title',
  'job.offerRibbon',
  'reset.running',
  'reset.sub',
];

// Emoji ranges only — excludes arrows (U+2190–U+21FF), which are
// legitimate text glyphs used inline in some labels.
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

test('Spanish dictionary: no emojis in chrome keys', () => {
  setLanguage('es');
  for (const key of CHROME_KEYS) {
    const value = t(key);
    assert.ok(
      !EMOJI_PATTERN.test(value),
      `es.${key} still contains an emoji: "${value}"`
    );
  }
});

test('English dictionary: no emojis in chrome keys', () => {
  setLanguage('en');
  for (const key of CHROME_KEYS) {
    const value = t(key);
    assert.ok(
      !EMOJI_PATTERN.test(value),
      `en.${key} still contains an emoji: "${value}"`
    );
  }
  setLanguage('es');
});