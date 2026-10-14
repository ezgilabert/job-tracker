// ============================================================
// Tests: icon() helper (sprite reference + name guard)
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { icon } from '../../js/app/icons.js';

// ------------------------------------------------------------
// Happy path
// ------------------------------------------------------------
test('icon: renders a valid name', () => {
  const out = icon('icon-check');
  assert.equal(
    out,
    '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="./assets/icons.svg#icon-check"/></svg>'
  );
});

test('icon: adds the className when provided', () => {
  const out = icon('icon-check', 'my-class');
  assert.match(out, /class="my-class"/);
});

test('icon: no class attribute when className is empty', () => {
  const out = icon('icon-check');
  assert.ok(!out.includes('class='));
});

// ------------------------------------------------------------
// Guard: type
// ------------------------------------------------------------
test('icon: rejects empty string', () => {
  assert.equal(icon(''), '');
});

test('icon: rejects non-string', () => {
  assert.equal(icon(null), '');
  assert.equal(icon(undefined), '');
  assert.equal(icon(42), '');
  assert.equal(icon({}), '');
});

// ------------------------------------------------------------
// Guard: prefix
// ------------------------------------------------------------
test('icon: rejects names without the icon- prefix', () => {
  assert.equal(icon('check'), '');
  assert.equal(icon('svg-check'), '');
  assert.equal(icon('my-icon-check'), '');
});

// ------------------------------------------------------------
// Guard: character set
// ------------------------------------------------------------
test('icon: rejects uppercase letters', () => {
  assert.equal(icon('icon-Check'), '');
  assert.equal(icon('ICON-check'), '');
});

test('icon: rejects spaces', () => {
  assert.equal(icon('icon check'), '');
  assert.equal(icon('icon- check'), '');
});

test('icon: rejects slashes and dots', () => {
  assert.equal(icon('icon-check/test'), '');
  assert.equal(icon('icon-check.js'), '');
  assert.equal(icon('icon-check..'), '');
});

test('icon: rejects HTML special characters (injection guard)', () => {
  assert.equal(icon('icon-<script>'), '');
  assert.equal(icon('icon-check"onload="alert(1)'), '');
  assert.equal(icon('icon-check><use href="evil'), '');
});

test('icon: rejects underscores (sprite uses hyphens only)', () => {
  assert.equal(icon('icon-my_check'), '');
});

// ------------------------------------------------------------
// Guard: allowed characters
// ------------------------------------------------------------
test('icon: accepts digits in the name', () => {
  const out = icon('icon-123');
  assert.ok(out.includes('icon-123'));
});

test('icon: accepts multiple hyphens', () => {
  const out = icon('icon-multi-word-name');
  assert.ok(out.includes('icon-multi-word-name'));
});

test('icon: accepts single-letter suffix', () => {
  const out = icon('icon-x');
  assert.ok(out.includes('icon-x'));
});