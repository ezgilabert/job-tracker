# Job Tracker

Local app for tracking a job search: applications, process stages, and referrals.

No backend or build step. Data lives in the browser's `localStorage`.

## Features

- **Sign-in screen** with tabs for Login / Register, password visibility toggle,
  a "Continue without an account" guest option, and social provider stubs
  (Option 1 layout).
- Create, edit, and delete applications (company, role, date, link, salary, contact, notes).
- Stage workflow: Guardado → Aplicado → interviews / challenges → Oferta.
- Close with a reason: Rechazado, Ghosted, Descartado, or Oferta.
- Notes when advancing a stage, plus steps marked as not applicable.
- Reorder cards with drag and drop.
- Filters by status and stats (total, active, in process, offers, closed).
- Referrals with their own workflow, company links, and a shortcut to create or attach an application.
- Light / dark theme, full i18n (ES / EN).

The first visit loads sample applications. Edits persist in the browser.

## Authentication

The app ships with a lightweight sign-in screen (`login.html`) that acts as a gate
before the main application.

- Two tabs: **Sign in** and **Create account**.
- Social providers (Google, GitHub) are wired as **UI stubs only**.
- **Continue without an account** — creates a guest session (`guest: true`). Same
  guards and logout flow as a real session; when the backend arrives, a guest can
  be restricted to read-only or trial mode.
- **No credential validation yet** — submitting either form stores a local session
  and redirects to `index.html`. A backend will validate the credentials later.
- "Remember me" keeps the session in `localStorage`; when unchecked, the session
  lives in `sessionStorage` and expires with the tab.
- The header of the main app includes a **Sign out** button that clears the session
  and returns to the login screen.
- The chosen logo and language from the app's settings are honoured on the login
  screen too.

### How the guard works

- `login.html` calls `redirectIfAuthenticated()` on boot — if a session exists it
  redirects to `index.html`.
- `index.html` calls `requireSession()` before mounting the app — if no session
  exists it redirects to `login.html`.

This keeps the flow self-contained and ready to swap the local session for a real
backend call later.

### Session shape

The local session is a plain JSON object persisted under `jobTrackerSession`:

| Field | Type | Notes |
| --- | --- | --- |
| `email` | `string` | Empty for guests |
| `name` | `string` | `"Guest"` for guest sessions |
| `remember` | `boolean` | `true` → `localStorage`, `false` → `sessionStorage` |
| `guest` | `boolean` | `true` for "Continue without an account" |
| `startedAt` | `string` | ISO date when the session was created |

Helpers exposed by `js/auth/session.js`:

| Function | Purpose |
| --- | --- |
| `getSession()` | Returns the parsed session or `null` |
| `isLoggedIn()` | `true` if any session exists (guest included) |
| `isGuest()` | `true` if the current session is a guest |
| `login({ email, name, remember, guest })` | Creates and persists a session |
| `logout()` | Clears the session from both storages |
| `requireSession(redirectTo)` | Guard for protected pages (used by `main.js`) |
| `redirectIfAuthenticated(redirectTo)` | Guard for `login.html` |

## Run

Scripts are ES modules, so you need an HTTP server rather than opening the file
directly.

```bash
npx serve .