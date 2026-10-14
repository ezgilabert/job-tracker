// ============================================================
// Tests: domain constants (sprite names, defaults, workflow)
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getStateIcon, getRefStateIcon,
  WORKFLOW_STEPS, REF_WORKFLOW_STEPS,
  CLOSED_STATES, REF_CLOSED_STATES,
  STATE_ICONS, REF_STATE_ICONS,
  ALL_STATES, REF_ALL_STATES,
  getDefaultConfig,
  LOGO_OPTIONS, DEFAULT_LOGO,
  BACKGROUND_OPTIONS, DEFAULT_BACKGROUND,
  DASHBOARD_STYLES, DEFAULT_DASHBOARD_STYLE,
} from '../../js/app/constants.js';

const SPRITE_NAME = /^icon-[a-z0-9-]+$/;

// ------------------------------------------------------------
// getStateIcon — every value must be a sprite name
// ------------------------------------------------------------
test('getStateIcon: returns the sprite name for a known status', () => {
  assert.equal(getStateIcon('Saved'), 'icon-bookmark');
  assert.equal(getStateIcon('Applied'), 'icon-send');
  assert.equal(getStateIcon('Offer'), 'icon-trophy');
  assert.equal(getStateIcon('Rejected'), 'icon-x-circle');
  assert.equal(getStateIcon('Ghosted'), 'icon-ghost');
  assert.equal(getStateIcon('Discarded'), 'icon-ban');
});

test('getStateIcon: fallback for unknown / empty status', () => {
  assert.equal(getStateIcon('Nope'), 'icon-sparkle');
  assert.equal(getStateIcon(''), 'icon-sparkle');
  assert.equal(getStateIcon(undefined), 'icon-sparkle');
});

test('STATE_ICONS: every value is a valid sprite name', () => {
  for (const [key, value] of Object.entries(STATE_ICONS)) {
    assert.match(value, SPRITE_NAME, `state "${key}" has invalid icon "${value}"`);
  }
});

// ------------------------------------------------------------
// getRefStateIcon
// ------------------------------------------------------------
test('getRefStateIcon: returns the sprite name for a known status', () => {
  assert.equal(getRefStateIcon('Pending'), 'icon-clock');
  assert.equal(getRefStateIcon('Referred'), 'icon-check');
  assert.equal(getRefStateIcon('Hired'), 'icon-user-check');
  assert.equal(getRefStateIcon('Not Applicable'), 'icon-ban');
});

test('getRefStateIcon: fallback for unknown status', () => {
  assert.equal(getRefStateIcon('Nope'), 'icon-sparkle');
});

test('REF_STATE_ICONS: every value is a valid sprite name', () => {
  for (const [key, value] of Object.entries(REF_STATE_ICONS)) {
    assert.match(value, SPRITE_NAME, `ref state "${key}" has invalid icon "${value}"`);
  }
});

// ------------------------------------------------------------
// Workflow step tables
// ------------------------------------------------------------
test('WORKFLOW_STEPS: every step has id, short and a sprite icon', () => {
  for (const step of WORKFLOW_STEPS) {
    assert.ok(step.id, 'step.id missing');
    assert.ok(step.short, `step "${step.id}" is missing short`);
    assert.match(step.icon, SPRITE_NAME, `step "${step.id}" has invalid icon`);
  }
});

test('REF_WORKFLOW_STEPS: every step has id, short and a sprite icon', () => {
  for (const step of REF_WORKFLOW_STEPS) {
    assert.ok(step.id, 'step.id missing');
    assert.ok(step.short, `step "${step.id}" is missing short`);
    assert.match(step.icon, SPRITE_NAME, `step "${step.id}" has invalid icon`);
  }
});

test('ALL_STATES: includes every workflow step and every closed state', () => {
  for (const s of WORKFLOW_STEPS) assert.ok(ALL_STATES.includes(s.id));
  for (const s of CLOSED_STATES) assert.ok(ALL_STATES.includes(s));
});

test('REF_ALL_STATES: includes every ref step and every ref closed state', () => {
  for (const s of REF_WORKFLOW_STEPS) assert.ok(REF_ALL_STATES.includes(s.id));
  for (const s of REF_CLOSED_STATES) assert.ok(REF_ALL_STATES.includes(s));
});

// ------------------------------------------------------------
// getDefaultConfig
// ------------------------------------------------------------
test('getDefaultConfig: returns a fresh object each call', () => {
  const a = getDefaultConfig();
  const b = getDefaultConfig();
  assert.notEqual(a, b);
  a.lang = 'en';
  assert.equal(b.lang, 'es');
});

test('getDefaultConfig: has the expected top-level shape', () => {
  const cfg = getDefaultConfig();
  assert.equal(cfg.lang, 'es');
  assert.equal(cfg.logo, DEFAULT_LOGO);
  assert.equal(cfg.background, DEFAULT_BACKGROUND);
  assert.equal(cfg.dashboardStyleJobs, DEFAULT_DASHBOARD_STYLE);
  assert.equal(cfg.dashboardStyleRefs, DEFAULT_DASHBOARD_STYLE);
  assert.equal(cfg.defaultInitialStatus, 'Applied');
  assert.ok(Array.isArray(cfg.filters));
  assert.ok(Array.isArray(cfg.initialStatuses));
  assert.ok(cfg.profile && typeof cfg.profile === 'object');
  assert.ok(cfg.roles && typeof cfg.roles === 'object');
});

test('getDefaultConfig: initial statuses cover the full workflow', () => {
  const cfg = getDefaultConfig();
  assert.equal(cfg.initialStatuses.length, WORKFLOW_STEPS.length);
  for (const s of WORKFLOW_STEPS) {
    assert.ok(
      cfg.initialStatuses.includes(s.id),
      `initial statuses missing "${s.id}"`
    );
  }
});

// ------------------------------------------------------------
// Appearance tables
// ------------------------------------------------------------
test('LOGO_OPTIONS: every entry has id, label and a sprite-based svg', () => {
  for (const logo of LOGO_OPTIONS) {
    assert.ok(logo.id);
    assert.ok(logo.label);
    assert.match(logo.svg, /<svg[^>]*><use href="\.\/assets\/icons\.svg#icon-[a-z0-9-]+"\/><\/svg>/);
  }
});

test('BACKGROUND_OPTIONS: "none" is present and default is valid', () => {
  const ids = BACKGROUND_OPTIONS.map(o => o.id);
  assert.ok(ids.includes('none'));
  assert.ok(ids.includes(DEFAULT_BACKGROUND));
});

test('DASHBOARD_STYLES: default is included', () => {
  assert.ok(DASHBOARD_STYLES.includes(DEFAULT_DASHBOARD_STYLE));
});