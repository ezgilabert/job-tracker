// ============================================================
// Tests: utility helpers
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml, daysSince, formatDate, formatDateTime,
  todayISO, uid, ensureArray, cloneArray,
} from '../js/utils.js';

// Builds the local YYYY-MM-DD string for a given Date (or now).
// Matches what todayISO() does internally, so the tests are
// timezone-agnostic.
function localISODate(d = new Date()) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

// ------------------------------------------------------------
// escapeHtml
// ------------------------------------------------------------
test('escapeHtml: escapes all HTML-sensitive characters', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml("a & b"), 'a &amp; b');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
});

test('escapeHtml: null / undefined → empty string', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml: numbers and plain strings pass through', () => {
  assert.equal(escapeHtml('hello'), 'hello');
  assert.equal(escapeHtml(42), '42');
});

// ------------------------------------------------------------
// daysSince
// ------------------------------------------------------------
test('daysSince: null → null', () => {
  assert.equal(daysSince(null), null);
  assert.equal(daysSince(''), null);
});

test('daysSince: today → 0', () => {
  assert.equal(daysSince(localISODate()), 0);
});

test('daysSince: 3 days ago', () => {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  assert.equal(daysSince(localISODate(d)), 3);
});

// ------------------------------------------------------------
// formatDate / formatDateTime
// ------------------------------------------------------------
test('formatDate: null → empty string', () => {
  assert.equal(formatDate(null), '');
});

test('formatDate: produces a non-empty string containing the year', () => {
  const out = formatDate('2025-06-15');
  assert.ok(typeof out === 'string' && out.length > 0);
  assert.ok(out.includes('2025'));
});

test('formatDateTime: null → empty string', () => {
  assert.equal(formatDateTime(null), '');
});

test('formatDateTime: invalid input → empty string', () => {
  assert.equal(formatDateTime('not-a-date'), '');
});

// ------------------------------------------------------------
// todayISO
// ------------------------------------------------------------
test('todayISO: matches the YYYY-MM-DD pattern', () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
});

test('todayISO: equals the local ISO date', () => {
  assert.equal(todayISO(), localISODate());
});

// ------------------------------------------------------------
// uid
// ------------------------------------------------------------
test('uid: returns a number', () => {
  assert.equal(typeof uid(), 'number');
});

test('uid: generates unique values on rapid calls', () => {
  const set = new Set();
  for (let i = 0; i < 1000; i++) set.add(uid());
  assert.equal(set.size, 1000);
});

test('uid: values are strictly increasing', () => {
  const a = uid();
  const b = uid();
  const c = uid();
  assert.ok(a < b && b < c);
});

// ------------------------------------------------------------
// ensureArray / cloneArray
// ------------------------------------------------------------
test('ensureArray: returns [] for non-arrays', () => {
  assert.deepEqual(ensureArray(null), []);
  assert.deepEqual(ensureArray(undefined), []);
  assert.deepEqual(ensureArray('x'), []);
  assert.deepEqual(ensureArray({}), []);
});

test('ensureArray: returns the same array', () => {
  const arr = [1, 2, 3];
  assert.equal(ensureArray(arr), arr);
});

test('cloneArray: returns a new array', () => {
  const arr = [1, 2, 3];
  const copy = cloneArray(arr);
  assert.notEqual(copy, arr);
  assert.deepEqual(copy, arr);
});

test('cloneArray: non-arrays → []', () => {
  assert.deepEqual(cloneArray(null), []);
  assert.deepEqual(cloneArray('x'), []);
});