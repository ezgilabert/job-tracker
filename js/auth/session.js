// ============================================================
// Session: mocked auth (single valid user).
//
// CLIENT-SIDE ONLY. Esto NO es seguridad real: alguien con
// devtools puede saltarlo. Es "raising the bar" mientras no
// exista backend. Cuando haya API:
//   - validateCredentials() → POST /auth/login
//   - login()               → guardar httpOnly cookie del server
//   - requireSession()      → GET /auth/me
// ============================================================

const SESSION_KEY         = 'jobTrackerSession';
const FRESH_LOGIN_FLAG    = 'jobTrackerFreshLogin';
const RATE_KEY            = 'jobTrackerLoginRate';
const INSTALL_SECRET_KEY  = 'jobTrackerInstallSecret';

// Políticas
const MAX_ATTEMPTS    = 5;                 // intentos antes del lockout
const LOCKOUT_MS      = 5 * 60 * 1000;     // 5 min de bloqueo
const SESSION_TTL_MS  = 30 * 60 * 1000;    // 30 min de inactividad

// ------------------------------------------------------------
// Credenciales (hash SHA-256 de `${salt}:${password}`)
//
// ⚠️ REEMPLAZAR `passwordHash` con el hash real. Para generarlo:
//   1. Abrí login.html en el navegador.
//   2. En la consola:
//        const m = await import('./js/auth/session.js');
//        await m.computeHash('a7f3d9e2c4b8a1f6', 'TU_PASSWORD');
//   3. Pegá el hex resultante en passwordHash y NO dejes la
//      contraseña en texto plano en ningún lado del repo.
// ------------------------------------------------------------
const CREDENTIALS = [
  {
    username: 'egarcia',
    salt: 'a7f3d9e2c4b8a1f6',
    passwordHash: 'e7212870e33e35acd935ab00bd42e36c919caff49d2e69e2fd85d6a0b9465d8f',
    name: 'E. García',
    email: 'egarcia@jobtracker.local',
  },
];

// ------------------------------------------------------------
// Cripto helpers
// ------------------------------------------------------------
async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Expuesto para que puedas generar el hash desde la consola. */
export async function computeHash(salt, password) {
  return sha256Hex(`${salt}:${password}`);
}

/**
 * Secreto por instalación (no por usuario). Se genera una sola vez
 * y se guarda en localStorage. Sirve para firmar la sesión: sin
 * este valor, editar el JSON del sessionStorage no alcanza para
 * forjar una sesión válida.
 */
function getInstallSecret() {
  let s = localStorage.getItem(INSTALL_SECRET_KEY);
  if (!s) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    s = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(INSTALL_SECRET_KEY, s);
  }
  return s;
}

async function signSession(session) {
  const secret = getInstallSecret();
  const payload = `${session.username}|${session.startedAt}|${session.expiresAt}`;
  return sha256Hex(`${secret}:${payload}`);
}

// ------------------------------------------------------------
// Rate limiting (persistido en localStorage)
// ------------------------------------------------------------
function readRate() {
  try {
    const r = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
    return {
      failures: Number(r.failures) || 0,
      lockedUntil: Number(r.lockedUntil) || 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeRate(r) {
  try { localStorage.setItem(RATE_KEY, JSON.stringify(r)); } catch {}
}

export function getLockoutRemainingMs() {
  const r = readRate();
  return Math.max(0, r.lockedUntil - Date.now());
}

function registerFailure() {
  const r = readRate();
  r.failures += 1;
  if (r.failures >= MAX_ATTEMPTS) {
    r.lockedUntil = Date.now() + LOCKOUT_MS;
    r.failures = 0;
  }
  writeRate(r);
}

function clearRate() {
  writeRate({ failures: 0, lockedUntil: 0 });
}

// ------------------------------------------------------------
// Validación de credenciales (async por el hash)
// ------------------------------------------------------------
/**
 * @returns {Promise<
 *   | {locked:true}
 *   | {username:string,name:string,email:string}
 *   | null
 * >}
 */
export async function validateCredentials(identifier, password) {
  if (getLockoutRemainingMs() > 0) return { locked: true };

  const id = String(identifier || '').trim().toLowerCase();
  const pw = String(password || '');
  if (!id || !pw) {
    registerFailure();
    return null;
  }

  for (const u of CREDENTIALS) {
    if (u.username.toLowerCase() !== id && u.email.toLowerCase() !== id) continue;
    const hash = await computeHash(u.salt, pw);
    if (hash === u.passwordHash) {
      clearRate();
      return { username: u.username, name: u.name, email: u.email };
    }
  }

  registerFailure();
  return null;
}

// ------------------------------------------------------------
// Sesión
// ------------------------------------------------------------
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return null;
    if (s.expiresAt && Date.now() > s.expiresAt) return null;
    return s;
  } catch {
    return null;
  }
}

export async function isValidSession(s = getSession()) {
  if (!s || s.valid !== true || !s.username || !s.sig) return false;
  if (s.expiresAt && Date.now() > s.expiresAt) return false;
  const expected = await signSession(s);
  return expected === s.sig;
}

export async function isLoggedIn() {
  return isValidSession();
}

export function isGuest() {
  return false;
}

export async function login({ username = '', email = '', name = '' } = {}) {
  const startedAt = new Date().toISOString();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const base = { username, email, name, valid: true, startedAt, expiresAt };
  const sig = await signSession(base);
  const session = { ...base, sig };

  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(FRESH_LOGIN_FLAG, '1');
  } catch (e) {
    console.error('[Session] persist failed', e);
  }
  return session;
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(FRESH_LOGIN_FLAG);
  } catch (e) {
    console.error('[Session] logout failed', e);
  }
}

// ------------------------------------------------------------
// Guards
// ------------------------------------------------------------
export async function requireSession(redirectTo = './login.html') {
  const session = getSession();
  const fresh = sessionStorage.getItem(FRESH_LOGIN_FLAG) === '1';
  const valid = await isValidSession(session);

  if (session && valid && fresh) {
    sessionStorage.removeItem(FRESH_LOGIN_FLAG);
    return true;
  }

  logout();
  window.location.replace(redirectTo);
  return false;
}

export function redirectIfAuthenticated(/* redirectTo */) {
  // El login es siempre obligatorio: nunca salteamos la pantalla.
  return false;
}

// ------------------------------------------------------------
// Heartbeat de inactividad (llamar desde main.js)
// ------------------------------------------------------------
export function startSessionHeartbeat(onExpire) {
  let last = Date.now();
  const bump = () => { last = Date.now(); };

  ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(ev =>
    document.addEventListener(ev, bump, { passive: true })
  );

  setInterval(async () => {
    const s = getSession();
    if (!s) return;
    const expired = Date.now() - last > SESSION_TTL_MS;
    const valid = await isValidSession(s);
    if (expired || !valid) {
      logout();
      if (typeof onExpire === 'function') onExpire();
      else window.location.replace('./login.html');
    }
  }, 30_000);
}