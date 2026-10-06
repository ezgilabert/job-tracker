// ============================================================
// Session: lightweight auth state (backend will validate later)
// ============================================================

const SESSION_KEY = 'jobTrackerSession';

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

export function isLoggedIn() {
  return getSession() !== null;
}

// ------------------------------------------------------------
// Guest helpers
// ------------------------------------------------------------
export function isGuest() {
  const s = getSession();
  return s !== null && s.guest === true;
}

// ------------------------------------------------------------
// Create a session (no credential validation yet)
//   - guest: true → "Continue without an account"
// ------------------------------------------------------------
export function login({ email = '', name = '', remember = false, guest = false } = {}) {
  const session = {
    email,
    name,
    remember,
    guest,
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