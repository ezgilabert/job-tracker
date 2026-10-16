// ============================================================
// Tests: reactive Store with persistence and migration
// ============================================================

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ------------------------------------------------------------
// Minimal localStorage mock — installed before any Store runs.
// The Store only touches localStorage inside its methods, not
// at module load, so a global stub is enough.
// ------------------------------------------------------------
function installLocalStorageMock() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
  };
  return map;
}

installLocalStorageMock();

const { Store } = await import('../../js/app/store.js');

// ------------------------------------------------------------
// Fresh store
// ------------------------------------------------------------
test('Store: seeds initial value when localStorage is empty', () => {
  localStorage.clear();
  const store = new Store('k1', { a: 1 });
  assert.deepEqual(store.get(), { a: 1 });
});

test('Store: seeds with seed() when provided', () => {
  localStorage.clear();
  const store = new Store('k2', [], { seed: () => [1, 2, 3] });
  assert.deepEqual(store.get(), [1, 2, 3]);
});

// ------------------------------------------------------------
// Persistence
// ------------------------------------------------------------
test('Store: update() persists to localStorage', () => {
  localStorage.clear();
  const store = new Store('k3', []);
  store.update(() => [1, 2]);

  const raw = JSON.parse(localStorage.getItem('k3'));
  assert.deepEqual(raw.data, [1, 2]);
  assert.equal(typeof raw.version, 'number');
});

test('Store: reload from localStorage after a new instance', () => {
  localStorage.clear();
  const a = new Store('k4', []);
  a.update(() => ['x', 'y']);

  const b = new Store('k4', []);
  assert.deepEqual(b.get(), ['x', 'y']);
});

test('Store: corrupt JSON falls back to defaults', () => {
  localStorage.clear();
  localStorage.setItem('k5', '{not valid json');
  const store = new Store('k5', { ok: true });
  assert.deepEqual(store.get(), { ok: true });
});

test('Store: update(undefined) is ignored', () => {
  localStorage.clear();
  const store = new Store('k6', [1]);
  const before = store.get();
  store.update(() => undefined);
  assert.deepEqual(store.get(), before);
});

// ------------------------------------------------------------
// subscribe
// ------------------------------------------------------------
test('Store: subscribe fires immediately with current state', () => {
  localStorage.clear();
  const store = new Store('k7', { v: 1 });
  let seen = null;
  store.subscribe(state => { seen = state; });
  assert.deepEqual(seen, { v: 1 });
});

test('Store: subscribe fires on update', () => {
  localStorage.clear();
  const store = new Store('k8', { v: 1 });
  const seen = [];
  store.subscribe(state => seen.push(state.v));
  store.update(s => ({ v: s.v + 1 }));
  store.update(s => ({ v: s.v + 1 }));
  assert.deepEqual(seen, [1, 2, 3]);
});

test('Store: unsubscribe stops updates', () => {
  localStorage.clear();
  const store = new Store('k9', { v: 0 });
  const seen = [];
  const off = store.subscribe(s => seen.push(s.v));
  store.update(s => ({ v: 1 }));
  off();
  store.update(s => ({ v: 2 }));
  assert.deepEqual(seen, [0, 1]);
});

test('Store: errors in one subscriber do not prevent other subscribers from firing', () => {
  localStorage.clear();
  const store = new Store('k9_err', { v: 0 });
  const seen = [];
  store.subscribe(() => {
    // will throw on update, not on initial call
    if (seen.length > 0) throw new Error('Subscriber exploded');
  });
  store.subscribe(s => seen.push(s.v));
  store.update(s => ({ v: 1 }));
  assert.deepEqual(seen, [0, 1]);
});

// ------------------------------------------------------------
// Versioning + migration
// ------------------------------------------------------------
test('Store: migration runs on version mismatch', () => {
  localStorage.clear();
  // Simulate a v1 payload with old data
  localStorage.setItem('k10', JSON.stringify({ version: 1, data: [{ a: 1 }] }));

  const store = new Store('k10', [], {
    version: 2,
    migrate: (data) => data.map(x => ({ ...x, migrated: true })),
  });

  assert.deepEqual(store.get(), [{ a: 1, migrated: true }]);

  const raw = JSON.parse(localStorage.getItem('k10'));
  assert.equal(raw.version, 2);
});

test('Store: migration does not run when versions match', () => {
  localStorage.clear();
  localStorage.setItem('k11', JSON.stringify({ version: 2, data: [{ a: 1 }] }));

  let ran = 0;
  const store = new Store('k11', [], {
    version: 2,
    migrate: (data) => { ran++; return data; },
  });

  assert.equal(ran, 0);
  assert.deepEqual(store.get(), [{ a: 1 }]);
});

test('Store: legacy flat array payload is rewrapped + migrated', () => {
  localStorage.clear();
  localStorage.setItem('k12', JSON.stringify([{ a: 1 }]));

  const store = new Store('k12', [], {
    version: 1,
    migrate: (data) => data.map(x => ({ ...x, touched: true })),
  });

  assert.deepEqual(store.get(), [{ a: 1, touched: true }]);
  const raw = JSON.parse(localStorage.getItem('k12'));
  assert.equal(raw.version, 1);
  assert.ok(Array.isArray(raw.data));
});