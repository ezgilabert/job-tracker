// ============================================================
// Session: mocked auth (single valid user).
// NOTE: this is a client-side gate only — it stops casual access
// but anyone with devtools can bypass it. Replace with a real
// backend call when the API is ready.
// ============================================================

const SESSION_KEY = 'jobTrackerSession';

// ------------------------------------------------------------
// Mocked credentials — the ONLY way to get a valid session.
// Change these values to rotate the login.
// ------------------------------------------------------------
const VALID_USERS = [
  {
    username: 'egarcia',
    password: 'bonito',
    name: 'E. García',
    email: 'egarcia@jobtracker.local',
  },
];

/**
 * Validate a user/password pair against the mocked list.
 * @param {string} identifier  username or email (case-insensitive)
 * @param {string} password
 * @returns {{username:string,name:string,email:string}|null}
 */
export function validateCredentials(identifier, password) {
  const id = String(identifier || '').trim().toLowerCase();
  const pw = String(password || '');
  if (!id || !pw) return null;

  const found = VALID_USERS.find(u =>
    (u.username.toLowerCase() === id || u.email.toLowerCase() === id) &&
    u.password === pw
  );

  return found
    ? { username: found.username, name: found.name, email: found.email }
    : null;
}

// ------------------------------------------------------------
// Read current session
// ------------------------------------------------------------
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * A session is only "logged in" when it was minted by login() with
 * valid credentials (valid === true). Hand-crafted JSON or leftovers
 * from previous guest sessions are rejected.
 */
export function isValidSession(s = getSession()) {
  return !!(s && s.valid === true && s.username);
}

export function isLoggedIn() {
  return isValidSession();
}

// Kept for backwards compatibility; guests are no longer supported.
export function isGuest() {
  return false;
}

// ------------------------------------------------------------
// Create a session — only call this AFTER validateCredentials().
// ------------------------------------------------------------
export function login({ username = '', email = '', name = '', remember = false } = {}) {
  const session = {
    username,
    email,
    name,
    remember,
    valid: true, // marker required by isValidSession()
    startedAt: new Date().toISOString(),
  };

  const target = remember ? localStorage : sessionStorage;
  try {
    // Only one storage should hold the session at a time.
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    target.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('[Session] persist failed', e);
  }
  return session;
}

// ------------------------------------------------------------
// Clear session from both storages
// ------------------------------------------------------------
export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('[Session] logout failed', e);
  }
}

// ------------------------------------------------------------
// Guard: called from the app entry. Redirects when unauthenticated.
// Returns true when the app should keep booting.
// ------------------------------------------------------------
export function requireSession(redirectTo = './login.html') {
  if (isLoggedIn()) return true;
  window.location.replace(redirectTo);
  return false;
}

// ------------------------------------------------------------
// Guard for the login page. Returns true when a redirect happened.
// ------------------------------------------------------------
export function redirectIfAuthenticated(redirectTo = './index.html') {
  if (!isLoggedIn()) return false;
  window.location.replace(redirectTo);
  return true;
}