// ============================================================
// Users: local user registry backed by localStorage.
//
// This is a mock auth layer for a single-device app. Users are
// stored in the browser and passwords are hashed with a per-user
// salt. Anyone with DevTools can read the hashes or replace the
// storage — this is UX, not security. The README explains the
// trade-off.
//
// There is no default account. On a fresh install the store is
// empty; the first user who registers becomes the owner of the
// instance. `hasAnyUser()` lets the login screen decide whether
// to open on the register tab.
//
// Public API:
//   getUsers()                       → array of user records
//   hasAnyUser()                     → boolean
//   findUserByUsername(username)     → user | null (case-insensitive)
//   findUserByEmail(email)           → user | null (case-insensitive)
//   findUserById(id)                 → user | null
//   createUser({ username, email, name, password }) → user
//   verifyPassword(user, password)   → boolean
//   validateRegistration({ ... })    → { valid, errors }
//   computeHash(salt, password)      → hex string
//   deleteUser(id)                   → boolean
//
// All synchronous except computeHash / createUser / verifyPassword
// (they call crypto.subtle.digest which returns a Promise).
// ============================================================

const STORAGE_KEY = 'jobTrackerUsers';

// ------------------------------------------------------------
// Storage helpers
// ------------------------------------------------------------
export function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('[Users] save failed', err);
  }
}

/**
 * @returns {boolean} true if at least one user is registered.
 * Use this on the login screen to decide whether to open on the
 * register tab (fresh install) or the login tab (returning user).
 */
export function hasAnyUser() {
  return getUsers().length > 0;
}

// ------------------------------------------------------------
// Lookups
// ------------------------------------------------------------
export function findUserByUsername(username) {
  if (!username) return null;
  const lower = String(username).toLowerCase();
  return getUsers().find(u => u.username.toLowerCase() === lower) || null;
}

export function findUserByEmail(email) {
  if (!email) return null;
  const lower = String(email).toLowerCase();
  return getUsers().find(u => u.email.toLowerCase() === lower) || null;
}

export function findUserById(id) {
  if (!id) return null;
  return getUsers().find(u => u.id === id) || null;
}

// ------------------------------------------------------------
// Hashing
// ------------------------------------------------------------
/**
 * SHA-256(salt + ':' + password) as lowercase hex.
 */
export async function computeHash(salt, password) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ------------------------------------------------------------
// Verification
// ------------------------------------------------------------
/**
 * @param {object} user  a record from getUsers()
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(user, password) {
  if (!user || typeof password !== 'string') return false;
  const hash = await computeHash(user.salt, password);
  return hash === user.passwordHash;
}

// ------------------------------------------------------------
// Creation
// ------------------------------------------------------------
/**
 * Creates a new user. Does NOT validate input — call
 * validateRegistration() first. Assumes uniqueness has been
 * checked; if a duplicate slips through, the first match wins on
 * login and the second is unreachable.
 *
 * @param {{ username: string, email: string, name?: string, password: string }} input
 * @returns {Promise<object>} the stored user (without the plain password)
 */
export async function createUser({ username, email, name = '', password }) {
  const salt = generateSalt();
  const passwordHash = await computeHash(salt, password);

  const user = {
    id: generateId(),
    username: username.trim(),
    email: email.trim(),
    name: name.trim(),
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const users = getUsers();
  users.push(user);
  saveUsers(users);
  return user;
}

export function deleteUser(id) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx < 0) return false;
  users.splice(idx, 1);
  saveUsers(users);
  return true;
}

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  const t = username.trim();
  if (t.length < 3 || t.length > 30) return false;
  return USERNAME_RE.test(t);
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const t = email.trim();
  if (t.length < 3 || t.length > 150) return false;
  return EMAIL_RE.test(t);
}

/**
 * Field-level validation for the register form.
 * Returns the i18n keys of the errors, not the translated strings.
 *
 * @param {{ username, email, password, confirmPassword }} input
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateRegistration({ username, email, password, confirmPassword }) {
  const errors = {};

  // Username
  const u = (username || '').trim();
  if (!u) {
    errors.username = 'auth.error.register.usernameRequired';
  } else if (u.length < 3 || u.length > 30) {
    errors.username = 'auth.error.register.usernameLength';
  } else if (!USERNAME_RE.test(u)) {
    errors.username = 'auth.error.register.usernameFormat';
  } else if (findUserByUsername(u)) {
    errors.username = 'auth.error.register.usernameTaken';
  }

  // Email
  const e = (email || '').trim();
  if (!e) {
    errors.email = 'auth.error.register.emailRequired';
  } else if (!isValidEmail(e)) {
    errors.email = 'auth.error.register.emailFormat';
  } else if (findUserByEmail(e)) {
    errors.email = 'auth.error.register.emailTaken';
  }

  // Password
  const p = password || '';
  if (p.length < 8) {
    errors.password = 'auth.error.register.passwordTooShort';
  } else if (!/[a-zA-Z]/.test(p)) {
    errors.password = 'auth.error.register.passwordNeedsLetter';
  } else if (!/[0-9]/.test(p)) {
    errors.password = 'auth.error.register.passwordNeedsNumber';
  }

  // Confirmation
  if (p && password !== confirmPassword) {
    errors.confirmPassword = 'auth.error.register.passwordsMismatch';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}