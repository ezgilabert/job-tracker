// ============================================================
// Tests: session (rate limiting, signing, session helpers)
// ============================================================

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ------------------------------------------------------------
// Storage mocks. crypto.subtle, crypto.getRandomValues and
// crypto.randomUUID are global in Node 20+, so we only need to
// stub the two storage APIs.
// ------------------------------------------------------------
function installStorageMocks() {
  const localMap = new Map();
  const sessionMap = new Map();

  globalThis.localStorage = {
    getItem: (k) => (localMap.has(k) ? localMap.get(k) : null),
    setItem: (k, v) => { localMap.set(k, String(v)); },
    removeItem: (k) => { localMap.delete(k); },
    clear: () => { localMap.clear(); },
    get length() { return localMap.size; },
    key: (i) => [...localMap.keys()][i] ?? null,
  };

  globalThis.sessionStorage = {
    getItem: (k) => (sessionMap.has(k) ? sessionMap.get(k) : null),
    setItem: (k, v) => { sessionMap.set(k, String(v)); },
    removeItem: (k) => { sessionMap.delete(k); },
    clear: () => { sessionMap.clear(); },
    get length() { return sessionMap.size; },
    key: (i) => [...sessionMap.keys()][i] ?? null,
  };

  return { localMap, sessionMap };
}

installStorageMocks();

const { createUser } = await import('../../js/auth/users.js');
const {
  login, logout, getSession, isValidSession,
  validateCredentials, getLockoutRemainingMs,
  registerUser, getActiveUserId, updateSessionProfile,
} = await import('../../js/auth/session.js');

// ------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------
const VALID = {
  username: 'alice',
  email: 'alice@example.com',
  name: 'Alice',
  password: 'hunter2pass',
};

async function seedUser() {
  return createUser(VALID);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ============================================================
// Rate limiting
// ============================================================
test('getLockoutRemainingMs: 0 on a fresh install', () => {
  assert.equal(getLockoutRemainingMs(), 0);
});

test('validateCredentials: unknown identifier returns null', async () => {
  const res = await validateCredentials('nobody', 'whatever');
  assert.equal(res, null);
  assert.equal(getLockoutRemainingMs(), 0); // 1 failure, no lockout yet
});

test('validateCredentials: wrong password returns null', async () => {
  await seedUser();
  const res = await validateCredentials('alice', 'wrong');
  assert.equal(res, null);
  assert.equal(getLockoutRemainingMs(), 0);
});

test('validateCredentials: empty identifier or password returns null', async () => {
  assert.equal(await validateCredentials('', 'x'), null);
  assert.equal(await validateCredentials('alice', ''), null);
});

test('validateCredentials: 5 failures trigger a lockout', async () => {
  await seedUser();

  for (let i = 0; i < 5; i++) {
    await validateCredentials('alice', 'wrong');
  }

  assert.ok(getLockoutRemainingMs() > 0);

  // Any further call while locked returns the sentinel.
  const res = await validateCredentials('alice', 'hunter2pass');
  assert.deepEqual(res, { locked: true });
});

test('validateCredentials: a successful login clears the rate limit', async () => {
  await seedUser();

  // Two failures, then a success.
  await validateCredentials('alice', 'wrong');
  await validateCredentials('alice', 'wrong');
  const ok = await validateCredentials('alice', 'hunter2pass');
  assert.ok(ok && !ok.locked);

  // The counter should be back to zero: another failure won't
  // immediately lock.
  await validateCredentials('alice', 'wrong');
  assert.equal(getLockoutRemainingMs(), 0);
});

// ============================================================
// validateCredentials — success paths
// ============================================================
test('validateCredentials: accepts username', async () => {
  await seedUser();
  const res = await validateCredentials('alice', 'hunter2pass');
  assert.ok(res && !res.locked);
  assert.equal(res.username, 'alice');
  assert.equal(res.email, 'alice@example.com');
  assert.equal(res.name, 'Alice');
  assert.ok(res.id);
});

test('validateCredentials: accepts email', async () => {
  await seedUser();
  const res = await validateCredentials('alice@example.com', 'hunter2pass');
  assert.ok(res && res.username === 'alice');
});

test('validateCredentials: identifier is case-insensitive', async () => {
  await seedUser();
  const res = await validateCredentials('ALICE', 'hunter2pass');
  assert.ok(res && res.username === 'alice');
});

// ============================================================
// login / getSession
// ============================================================
test('login: stores a session in sessionStorage', async () => {
  const session = await login({
    userId: 'u-1',
    username: 'alice',
    email: 'alice@example.com',
    name: 'Alice',
  });

  assert.equal(session.userId, 'u-1');
  assert.equal(session.username, 'alice');
  assert.equal(session.valid, true);
  assert.ok(session.sig);
  assert.ok(session.startedAt);
  assert.ok(session.expiresAt);
});

test('login: sets ACTIVE_USER in localStorage', async () => {
  await login({ userId: 'u-2', username: 'bob', email: 'b@x.io', name: 'Bob' });
  assert.equal(getActiveUserId(), 'u-2');
});

test('getSession: null when nothing is stored', () => {
  assert.equal(getSession(), null);
});

test('getSession: returns the stored session', async () => {
  await login({ userId: 'u-3', username: 'carl', email: 'c@x.io', name: 'Carl' });
  const s = getSession();
  assert.equal(s.userId, 'u-3');
  assert.equal(s.username, 'carl');
});

test('getSession: null when JSON is corrupted', () => {
  sessionStorage.setItem('jobTrackerSession', '{not json');
  assert.equal(getSession(), null);
});

test('getSession: null when the session is expired', () => {
  sessionStorage.setItem('jobTrackerSession', JSON.stringify({
    userId: 'u-4',
    username: 'expired',
    valid: true,
    sig: 'x',
    startedAt: new Date().toISOString(),
    expiresAt: Date.now() - 1000,
  }));
  assert.equal(getSession(), null);
});

// ============================================================
// isValidSession
// ============================================================
test('isValidSession: true for a freshly created session', async () => {
  await login({ userId: 'u-5', username: 'dan', email: 'd@x.io', name: 'Dan' });
  const s = getSession();
  assert.equal(await isValidSession(s), true);
});

test('isValidSession: false for null', async () => {
  assert.equal(await isValidSession(null), false);
});

test('isValidSession: false when the signature is missing', () => {
  sessionStorage.setItem('jobTrackerSession', JSON.stringify({
    userId: 'u-6',
    username: 'x',
    valid: true,
    startedAt: new Date().toISOString(),
    expiresAt: Date.now() + 100000,
  }));
  return isValidSession(getSession()).then(v => assert.equal(v, false));
});

test('isValidSession: false when the signature is tampered', async () => {
  await login({ userId: 'u-7', username: 'eve', email: 'e@x.io', name: 'Eve' });
  const s = getSession();
  s.sig = 'deadbeef'.repeat(8); // 64-char fake
  assert.equal(await isValidSession(s), false);
});

// ============================================================
// logout
// ============================================================
test('logout: clears the session', async () => {
  await login({ userId: 'u-8', username: 'frank', email: 'f@x.io', name: 'Frank' });
  logout();
  assert.equal(getSession(), null);
});

test('logout: keeps ACTIVE_USER (so login page still applies config)', async () => {
  await login({ userId: 'u-9', username: 'gina', email: 'g@x.io', name: 'Gina' });
  logout();
  assert.equal(getActiveUserId(), 'u-9');
});

// ============================================================
// updateSessionProfile
// ============================================================
test('updateSessionProfile: patches name and email in place', async () => {
  await login({ userId: 'u-10', username: 'hank', email: 'h@x.io', name: 'Hank' });
  const updated = updateSessionProfile({ name: 'Hank Jr.', email: 'hj@x.io' });
  assert.equal(updated.name, 'Hank Jr.');
  assert.equal(updated.email, 'hj@x.io');
  assert.equal(updated.username, 'hank'); // untouched
  assert.equal(updated.userId, 'u-10');
});

test('updateSessionProfile: preserves the signature', async () => {
  await login({ userId: 'u-11', username: 'ian', email: 'i@x.io', name: 'Ian' });
  const before = getSession().sig;
  updateSessionProfile({ name: 'Ian Smith' });
  const after = getSession().sig;
  assert.equal(after, before);
  // And the session is still valid.
  assert.equal(await isValidSession(getSession()), true);
});

test('updateSessionProfile: partial update leaves other fields intact', async () => {
  await login({ userId: 'u-12', username: 'jane', email: 'j@x.io', name: 'Jane' });
  updateSessionProfile({ name: 'Jane Doe' });
  const s = getSession();
  assert.equal(s.name, 'Jane Doe');
  assert.equal(s.email, 'j@x.io');
});

test('updateSessionProfile: returns null when there is no session', () => {
  assert.equal(updateSessionProfile({ name: 'X' }), null);
});

// ============================================================
// registerUser
// ============================================================
test('registerUser: creates the user and logs them in', async () => {
  const user = await registerUser({
    username: 'kate',
    email: 'kate@x.io',
    name: 'Kate',
    password: 'hunter2pass',
  });
  assert.ok(user.id);

  const s = getSession();
  assert.equal(s.userId, user.id);
  assert.equal(s.username, 'kate');
  assert.equal(await isValidSession(s), true);
  assert.equal(getActiveUserId(), user.id);
});

test('registerUser: the new user can then log in with their password', async () => {
  await registerUser({
    username: 'leo',
    email: 'leo@x.io',
    name: 'Leo',
    password: 'hunter2pass',
  });
  logout();

  const res = await validateCredentials('leo', 'hunter2pass');
  assert.ok(res && !res.locked);
  assert.equal(res.username, 'leo');
});

// ============================================================
// getActiveUserId
// ============================================================
test('getActiveUserId: null on a fresh install', () => {
  assert.equal(getActiveUserId(), null);
});