// ============================================================
// Tests: local user registry
// ============================================================

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ------------------------------------------------------------
// Minimal localStorage mock.
// node:crypto provides webcrypto as `crypto` globally in Node 20+,
// so we only need to stub localStorage.
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

const {
  getUsers, hasAnyUser, findUserByUsername, findUserByEmail, findUserById,
  createUser, verifyPassword, deleteUser,
  validateRegistration,
  computeHash, isValidUsername, isValidEmail,
} = await import('../js/auth/users.js');

const STORAGE_KEY = 'jobTrackerUsers';

beforeEach(() => {
  localStorage.clear();
});

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const VALID = {
  username: 'alice',
  email: 'alice@example.com',
  name: 'Alice',
  password: 'hunter2pass',
};

// ------------------------------------------------------------
// Hashing
// ------------------------------------------------------------
test('computeHash: deterministic for the same salt+password', async () => {
  const a = await computeHash('salt', 'pw');
  const b = await computeHash('salt', 'pw');
  assert.equal(a, b);
});

test('computeHash: different salts produce different hashes', async () => {
  const a = await computeHash('salt1', 'pw');
  const b = await computeHash('salt2', 'pw');
  assert.notEqual(a, b);
});

test('computeHash: returns a 64-char hex string', async () => {
  const h = await computeHash('s', 'p');
  assert.match(h, /^[a-f0-9]{64}$/);
});

// ------------------------------------------------------------
// getUsers / hasAnyUser
// ------------------------------------------------------------
test('getUsers: empty localStorage → []', () => {
  assert.deepEqual(getUsers(), []);
});

test('getUsers: corrupt JSON → []', () => {
  localStorage.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(getUsers(), []);
});

test('getUsers: non-array JSON → []', () => {
  localStorage.setItem(STORAGE_KEY, '{"a":1}');
  assert.deepEqual(getUsers(), []);
});

test('hasAnyUser: false on empty storage', () => {
  assert.equal(hasAnyUser(), false);
});

test('hasAnyUser: false when the stored array is empty', () => {
  localStorage.setItem(STORAGE_KEY, '[]');
  assert.equal(hasAnyUser(), false);
});

test('hasAnyUser: true after a user is created', async () => {
  await createUser(VALID);
  assert.equal(hasAnyUser(), true);
});

// ------------------------------------------------------------
// createUser
// ------------------------------------------------------------
test('createUser: stores a user with a salted hash', async () => {
  const user = await createUser(VALID);

  assert.ok(user.id);
  assert.equal(user.username, 'alice');
  assert.equal(user.email, 'alice@example.com');
  assert.equal(user.name, 'Alice');
  assert.ok(user.salt);
  assert.match(user.passwordHash, /^[a-f0-9]{64}$/);
  assert.ok(!('password' in user), 'plain password must not be stored');

  const stored = getUsers();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, user.id);
});

test('createUser: generates a unique salt per user', async () => {
  const a = await createUser({ ...VALID, username: 'a', email: 'a@x.io' });
  const b = await createUser({ ...VALID, username: 'b', email: 'b@x.io' });
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.passwordHash, b.passwordHash);
});

test('createUser: trims whitespace from inputs', async () => {
  const user = await createUser({
    username: '  bob  ',
    email: '  bob@x.io  ',
    name: '  Bob  ',
    password: 'hunter2pass',
  });
  assert.equal(user.username, 'bob');
  assert.equal(user.email, 'bob@x.io');
  assert.equal(user.name, 'Bob');
});

// ------------------------------------------------------------
// Lookups
// ------------------------------------------------------------
test('findUserByUsername: case-insensitive', async () => {
  await createUser(VALID);
  assert.ok(findUserByUsername('alice'));
  assert.ok(findUserByUsername('ALICE'));
  assert.ok(findUserByUsername('Alice'));
  assert.equal(findUserByUsername('bob'), null);
});

test('findUserByEmail: case-insensitive', async () => {
  await createUser(VALID);
  assert.ok(findUserByEmail('alice@example.com'));
  assert.ok(findUserByEmail('ALICE@EXAMPLE.COM'));
  assert.equal(findUserByEmail('other@x.io'), null);
});

test('findUserById: returns the matching record', async () => {
  const u = await createUser(VALID);
  const found = findUserById(u.id);
  assert.equal(found?.id, u.id);
  assert.equal(findUserById('nope'), null);
});

// ------------------------------------------------------------
// verifyPassword
// ------------------------------------------------------------
test('verifyPassword: correct password', async () => {
  const user = await createUser(VALID);
  assert.equal(await verifyPassword(user, 'hunter2pass'), true);
});

test('verifyPassword: wrong password', async () => {
  const user = await createUser(VALID);
  assert.equal(await verifyPassword(user, 'wrong'), false);
});

test('verifyPassword: null user / empty password → false', async () => {
  assert.equal(await verifyPassword(null, 'x'), false);
  assert.equal(await verifyPassword({ salt: 'a', passwordHash: 'b' }, ''), false);
});

// ------------------------------------------------------------
// deleteUser
// ------------------------------------------------------------
test('deleteUser: removes the matching record', async () => {
  const u = await createUser(VALID);
  assert.equal(deleteUser(u.id), true);
  assert.equal(getUsers().length, 0);
  assert.equal(hasAnyUser(), false);
});

test('deleteUser: unknown id → false', () => {
  assert.equal(deleteUser('nope'), false);
});

// ------------------------------------------------------------
// validateRegistration — format + uniqueness
// ------------------------------------------------------------
test('validateRegistration: valid input passes', async () => {
  const out = validateRegistration({
    username: 'alice',
    email: 'alice@example.com',
    password: 'hunter2pass',
    confirmPassword: 'hunter2pass',
  });
  assert.equal(out.valid, true);
  assert.deepEqual(out.errors, {});
});

test('validateRegistration: username required', () => {
  const out = validateRegistration({
    username: '',
    email: 'a@b.io',
    password: 'hunter2pass',
    confirmPassword: 'hunter2pass',
  });
  assert.equal(out.errors.username, 'auth.error.register.usernameRequired');
});

test('validateRegistration: username too short / too long', () => {
  assert.equal(
    validateRegistration({ username: 'ab', email: 'a@b.io', password: 'hunter2pass', confirmPassword: 'hunter2pass' }).errors.username,
    'auth.error.register.usernameLength'
  );
  assert.equal(
    validateRegistration({ username: 'a'.repeat(31), email: 'a@b.io', password: 'hunter2pass', confirmPassword: 'hunter2pass' }).errors.username,
    'auth.error.register.usernameLength'
  );
});

test('validateRegistration: username format', () => {
  const out = validateRegistration({
    username: 'has spaces',
    email: 'a@b.io',
    password: 'hunter2pass',
    confirmPassword: 'hunter2pass',
  });
  assert.equal(out.errors.username, 'auth.error.register.usernameFormat');
});

test('validateRegistration: username already taken', async () => {
  await createUser(VALID);
  const out = validateRegistration({
    username: 'ALICE',
    email: 'other@x.io',
    password: 'hunter2pass',
    confirmPassword: 'hunter2pass',
  });
  assert.equal(out.errors.username, 'auth.error.register.usernameTaken');
});

test('validateRegistration: email required / invalid / taken', async () => {
  const base = { username: 'bob', password: 'hunter2pass', confirmPassword: 'hunter2pass' };

  assert.equal(
    validateRegistration({ ...base, email: '' }).errors.email,
    'auth.error.register.emailRequired'
  );
  assert.equal(
    validateRegistration({ ...base, email: 'not-an-email' }).errors.email,
    'auth.error.register.emailFormat'
  );

  await createUser(VALID);
  assert.equal(
    validateRegistration({ ...base, email: 'ALICE@example.com' }).errors.email,
    'auth.error.register.emailTaken'
  );
});

test('validateRegistration: password too short', () => {
  const out = validateRegistration({
    username: 'bob',
    email: 'bob@x.io',
    password: 'short1',
    confirmPassword: 'short1',
  });
  assert.equal(out.errors.password, 'auth.error.register.passwordTooShort');
});

test('validateRegistration: password needs a letter', () => {
  const out = validateRegistration({
    username: 'bob',
    email: 'bob@x.io',
    password: '12345678',
    confirmPassword: '12345678',
  });
  assert.equal(out.errors.password, 'auth.error.register.passwordNeedsLetter');
});

test('validateRegistration: password needs a number', () => {
  const out = validateRegistration({
    username: 'bob',
    email: 'bob@x.io',
    password: 'password',
    confirmPassword: 'password',
  });
  assert.equal(out.errors.password, 'auth.error.register.passwordNeedsNumber');
});

test('validateRegistration: passwords must match', () => {
  const out = validateRegistration({
    username: 'bob',
    email: 'bob@x.io',
    password: 'hunter2pass',
    confirmPassword: 'hunter3pass',
  });
  assert.equal(out.errors.confirmPassword, 'auth.error.register.passwordsMismatch');
});

test('validateRegistration: collects every field error at once', () => {
  const out = validateRegistration({
    username: '',
    email: 'bad',
    password: 'short',
    confirmPassword: 'other',
  });
  assert.equal(out.valid, false);
  assert.ok(out.errors.username);
  assert.ok(out.errors.email);
  assert.ok(out.errors.password);
  assert.ok(out.errors.confirmPassword);
});

// ------------------------------------------------------------
// Format helpers
// ------------------------------------------------------------
test('isValidUsername: boundaries', () => {
  assert.equal(isValidUsername('ab'), false);
  assert.equal(isValidUsername('abc'), true);
  assert.equal(isValidUsername('a'.repeat(30)), true);
  assert.equal(isValidUsername('a'.repeat(31)), false);
  assert.equal(isValidUsername('has spaces'), false);
  assert.equal(isValidUsername('has.dot'), false);
  assert.equal(isValidUsername('has_underscore'), true);
  assert.equal(isValidUsername('has-hyphen'), true);
});

test('isValidEmail: basic shape', () => {
  assert.equal(isValidEmail('a@b.io'), true);
  assert.equal(isValidEmail('a.b@c.d'), true);
  assert.equal(isValidEmail('no-at-sign'), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('a@b.'), false);
});