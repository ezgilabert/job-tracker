# Job Tracker

Local app for tracking a job search: applications, process stages, and referrals.

No backend, no build step. All data lives in the browser's `localStorage` (and
`sessionStorage` for the session). Ships as plain ES modules — just serve the
folder over HTTP.

---

## Features

### Applications (jobs)

- Create, edit, and delete applications: company, role, date, link, salary,
  work mode, contact, notes.
- **Collapsible form**: toggle the "New application" section open/closed via
  the header chevron button.
- **Form validation & requirements**:
  - **Company**: required (up to 120 chars).
  - **Role**: required unless initial status is "Saved" (up to 120 chars).
    Includes a searchable combo dropdown with role suggestions, category tags,
    and a quick trigger to add custom roles.
  - **Date**: required (defaults to today via `todayISO()`, resets to today
    after submission, cannot be empty).
  - **Salary**: required in both single-value and range modes, with an
    auto-formatted mask, ARS/USD currency toggle, and hourly/monthly switch.
  - **Job link OR contact**: at least one is mandatory — either a valid job
    posting URL or a complete contact block (contact name + valid contact link).
  - **Contact platform**: LinkedIn, Email, WhatsApp, or Other, validated
    strictly against each platform's format rules.
  - All rules live in `js/app/validators.js` as pure functions
    (`validateJobPayload`, `validateRefPayload`, `validateContactLink`) so they
    can be unit-tested without touching the DOM.
- **Stage workflow**: Saved → Applied → Contact → HR Interview →
  Technical Challenge → Live Coding → Technical Interview → Client Interview →
  Client Chat → Final Interview → References → Negotiation → Offer.
- **Offer confirmation**: applications in the "Offer" stage have an offer
  confirmation toggle (`offerConfirmed`), and closing an application as Offer
  automatically marks it confirmed.
- **Close with a reason**: Rejected, Ghosted, Discarded, Offer. Each close
  state comes with preset reason chips (localized) and a free-text field.
- **Advance with a note**: moving a stage forward opens a note modal. The "Save
  and advance" button remains disabled until at least one non-whitespace
  character is typed into the note field; "Continue without note" provides an
  intentional escape hatch to advance without a note. Closing via X, Escape or
  overlay click cancels the advance. Saved notes appear as a "PD" badge on the card.
- **Skip a stage**: mark the current step as "Not applicable" and jump to the
  next one.
- **Go back once**: you can move a stage back a single time per application
  (with confirmation).
- **Reopen** closed applications.
- **Drag & drop** to reorder cards. The list handler is extracted to
  `js/ui/dragDrop.js` — a reusable `mountDragDrop(el, { itemSelector, onReorder })`
  helper that any list can use.
- **History modal** with a timeline of every stage change, note, reason, and
  backtrack marker.
- **Filters** by status (configurable order and visibility) + free-text search
  across company, role, contact, notes, and salary. Search input is debounced
  (150 ms) via `debounce()` from `utils.js`. The filter bar itself is rendered
  by the reusable `mountToolbarFilter()` helper from `js/ui/toolbarFilter.js`.
- **Work mode picker**: On-site / Remote / Hybrid (with 1–5 office days).
- **Contact picker**: LinkedIn / Email / WhatsApp / Other, with per-platform
  validation and one-click actions on the card.

### Referrals (refs)

- Create, edit, and delete referrals: name, role, contact, link, relationship,
  status, notes.
- **Collapsible form**: toggle the "New referral" section open/closed via
  the header chevron button.
- **Form validation & requirements**:
  - **Name**: required (HTML5 required + defensive toast check).
  - **Role / Company**: required (up to 120 chars).
  - **Contact OR Link**: required (at least one must be provided).
  - **Relationship**: required (multi-select chips, at least one chip selected:
    Friend, Ex-colleague, Recruiter, Family, Mentee, Mentor, Other).
  - **Status**: required (defaults to "Pending" in the UI).
  - All five required fields feature a visual red asterisk (`*`) on their labels.
- **Own workflow**: Pending → Contacted → Referred → In Process → Hired
  (or Not applicable).
- **Advance with a note**: guarded note modal identical to jobs ("Save and
  advance" disabled until text is typed, "Continue without note" escape hatch,
  cancel on close). Both jobs and referrals share the same lifecycle through
  `createNoteModalController()` in `js/controllers/modals/noteModalFactory.js`.
- **Referral → application flow**: when a referral reaches "In Process", a modal
  offers to either create a new application (pre-filled) or link it to an
  existing one. The link is stored internally as `linkedJobId`.
- **Bidirectional auto-sync**:
  - When the linked application is closed as "Offer", the referral moves to
    "Hired".
  - When the referral advances to "Hired" and has a `linkedJobId`, the linked
    application automatically moves to "Offer" (with offer confirmed).
- **Go back once**: move back a single step per referral (with confirmation),
  **locked** if the referral is linked to an application (`linkedJobId`) to
  prevent state inconsistency.
- **History modal** with the same timeline treatment as jobs.
- **Filters by status** + free-text search across name, role, contact, notes.
  Same `mountToolbarFilter()` helper as jobs — the filter buttons are no
  longer hardcoded in `index.html`.
- **Mobile workflow strip**: on viewports ≤ 720px, the 5 stages switch to a
  compact number-only dot strip without overflowing text labels.

### Dashboards

Six configurable styles, **independently selectable** for jobs and referrals:

| Style | Description |
| --- | --- |
| `sparklines` | Four cards with mini trend graphs |
| `modular` | Featured card + metrics + side panel |
| `minimal` | Just big numbers, no graphs |
| `compact` | Chips + distribution bar |
| `circular` | SVG progress rings |
| `heatmap` | GitHub-style activity calendar |

- **Aggregations & metrics**: total applications/referrals, active count,
  highlights (offers / hired), closed count, 7-point weekly trend sparklines,
  84-day daily activity heatmaps, and top rankings (by company, role, or tag).
- Each dashboard is wrapped in a header ("Applications" / "Referrals") so the
  two are visually distinguishable.

### Configuration modal

Eight tabs, all changes staged as a draft and applied on Save:

- **Roles** — enable/disable 11 role categories, add custom roles with tags,
  hide/restore defaults.
- **Initial statuses** — pick which statuses appear in the create-job dropdown
  and which one is default.
- **Filters** — reorder and show/hide the filter chips (All, Active, Closed, and
  workflow steps).
- **Appearance** — logo (2 options: Target, Briefcase) and background (11 options:
  aurora, mesh, grid, dots, waves, conic, noise, stripes, cosmos, blobs, none).
- **Dashboard** — pick a style for jobs and another for referrals.
- **Language** — ES / EN with cascade pulse animation on change.
- **Profile** — first name, last name, username, email, bio, avatar (stored as
  dataURL). Auto-seeded on registration, real-time session sync.
- **Advanced** — export/import JSON backup with schema migration, plus three
  danger-zone actions: reset preferences, delete data, reset everything.
- **Mobile layout**: on viewports ≤ 720px, navigation tabs transform into a
  responsive 4×2 grid at the top of the modal, and panels collapse into
  single-column layouts.

An unsaved-changes badge appears whenever the draft differs from the saved
state, and closing prompts to discard or save.

### Appearance & UX

- Light / dark theme with a radial ripple animation on toggle.
- Eleven animated/static background styles.
- **Brand logo interactive hover animations** — the brand logo in the header,
  login screen, and loading splash scales up (1.05x) with a soft violet glow
  and triggers a smooth gradient sweep text animation (`brandGradientSweep`)
  across the title.
- **Hydration / Boot splash screen** — full-screen animated overlay with
  rotating status indicators ("Loading applications…", "Syncing referrals…",
  "Preparing your dashboard…") and an animated sliding gradient progress bar
  during store hydration and session verification.
- **Responsive mobile & tablet design**:
  - Global breakpoints: mobile (≤ 640px), tablet (641–720px), desktop (> 720px).
  - Header keeps brand and user menu on a single row without breaking; titles
    truncate with ellipsis on narrow screens.
  - Referral cards on mobile/tablet: full-width card body, floating top-right
    action buttons, 5-column number-only workflow dots (avoiding cramped text
    labels), and full-width stacked action buttons.
  - Application cards & toolbar: search box expands full width above filter
    chips on mobile.
  - Config modal: 4×2 grid tab navigation and stacked option cards on mobile.
- Toast notifications, custom confirm modals, and a progress-ring reset
  animation.
- **Undo for destructive actions** — delete, advance and close actions show a
  5-second toast with an "Undo" button and a countdown bar. Only the most
  recent action stays undoable; starting a new one dismisses the previous
  toast so the user never restores an intermediate state. Snapshots are deep-
  cloned with `structuredClone` (with a JSON fallback) so mutating the store
  after the snapshot can never leak into the undo buffer.
- **First-run welcome banner** — teaches the keyboard shortcuts, drag-to-
  reorder and where Settings lives. Dismissed once per user.
- All UI is fully internationalized (Spanish / English). Reason chips, empty
  states, and every label come from the dictionary — no hardcoded strings.
- Empty states are SVG-based, not emoji: clipboard for jobs, link for
  referrals, funnel for "no results in this filter".
- Card action buttons (edit / delete) use SVG icons with a soft-square style.
- **Reduced-motion support** — a global `@media (prefers-reduced-motion:
  reduce)` rule collapses every animation and transition to near-zero
  duration (aurora drift, confetti, shimmer, loading splash, theme ripple).
  `triggerThemeRipple()` also short-circuits when the OS setting is on, so
  the theme flips synchronously instead of waiting for the animation.
- **Keyboard focus ring** — a global `:focus-visible` rule draws a 2px
  violet outline on every interactive element reached via `Tab`, without
  affecting mouse clicks. Inputs, selects and textareas opt out because
  they already render their own focus ring via `box-shadow`.
- **Keyboard shortcuts**:
  - `n` — expand the "New application" section and focus the Company field.
  - `/` — focus the applications search box.
  - `Esc` — close any open modal.
- **Print / PDF export** — hides all interactive chrome and renders the two
  lists (applications + referrals) as a clean, printable document. Links keep
  their URLs in parentheses for reference. Available from the user menu.
- **Shared SVG sprite** — every icon lives once in `assets/icons.svg` and is
  referenced via `<use href="./assets/icons.svg#icon-name"/>`. No duplicated
  path data anywhere in the HTML or templates.

### Accessibility

- **Toasts are announced** — every toast (`showToast` and `showActionToast`)
  carries `role="status"`, `aria-live="polite"` and `aria-atomic="true"`, so
  screen readers pick up confirmations like *"Postulación guardada"* or
  *"Etapa avanzada"* without interrupting the current flow.
- **Modal focus trap** — the shared `createModal()` lifecycle keeps `Tab`
  and `Shift+Tab` inside the top-most modal. Escape closes only the top of
  the stack, and overlay clicks behave consistently with Escape.
- **Focus restoration** — when a modal closes, focus returns to the element
  that opened it (typically the trigger button). If that element is no longer
  in the DOM, focus is left to the browser's default.
- **Auto-focus on open** — modals focus their first focusable element on
  open, unless `onOpen` already focused something (e.g. an input).
- **Reduced motion** — global `@media (prefers-reduced-motion: reduce)`
  support (see above).
- **Global focus ring** — `:focus-visible` (see above).

---

## Authentication

Single-device, multi-user mock. **Not real security** — anyone with DevTools
can bypass it. It's "raising the bar" until a backend exists.

### User registry

Accounts live in `localStorage` under `jobTrackerUsers`. There is **no
default account**: on a fresh install the store is empty and the login
screen opens on the register tab. The first user who registers becomes
the owner of that browser profile. Once at least one user exists, the
login tab is re-enabled and the app behaves like a normal sign-in.

Each record looks like:

```js
{
  id,             // UUID
  username,       // 3–30 chars, [a-zA-Z0-9_-], unique (case-insensitive)
  email,          // unique (case-insensitive)
  name,           // optional display name
  salt,           // 16 random bytes, hex-encoded
  passwordHash,   // SHA-256(`${salt}:${password}`), hex
  createdAt,
}
```

- Passwords are hashed with `crypto.subtle.digest('SHA-256', …)`.
  The plain password never touches storage.
- Salt is **per user**, so two accounts with the same password produce
  different hashes.
- Login accepts **username or email** as the identifier, both
  case-insensitive.

The registry API lives in `js/auth/users.js`:

| Function | Purpose |
| --- | --- |
| `getUsers()` | Returns the raw array |
| `hasAnyUser()` | True if at least one account exists |
| `findUserByUsername(u)` / `findUserByEmail(e)` / `findUserById(id)` | Lookups |
| `createUser({ username, email, name, password })` | Hashes + stores |
| `verifyPassword(user, password)` | Compares a hash |
| `validateRegistration({ ... })` | Field-level validation, returns i18n keys |
| `computeHash(salt, pw)` | Utility |
| `deleteUser(id)` | Removes a record |

### Per-user data isolation

Every store is **scoped to the user id**:

| Logical store | `localStorage` key |
| --- | --- |
| Applications | `jobTrackerV2__<userId>` |
| Referrals | `jobTrackerReferrals__<userId>` |
| Config | `jobTrackerConfig__<userId>` |
| Welcome banner flag | `jobTrackerWelcomeDismissed__<userId>` |

Shared (not prefixed):

| What | Key | Why |
| --- | --- | --- |
| User registry | `jobTrackerUsers` | It's the registry itself. |
| Theme | `jobTrackerTheme` | Device-level preference (same screen, same light). |
| Last active user | `jobTrackerActiveUser` | Lets `login.html` show the last user's brand/background before a session exists. |
| Session | `jobTrackerSession` | Per-tab (`sessionStorage`). |
| Login rate limit | `jobTrackerLoginRate` | Per-install. |
| Install secret | `jobTrackerInstallSecret` | Used to sign sessions. |

`STORAGE_KEYS` in `js/app/constants.js` exposes the three prefixed keys
as functions (`STORAGE_KEYS.JOBS(userId)`), not strings — callers must
be explicit about which user they mean.

**Legacy migration.** Before the multi-user refactor, every store lived
under a single non-prefixed key. `migrateLegacyStorage(userId)` (in
`js/app/migrations.js`) runs once per boot: the first user who logs in
after the upgrade gets the old payloads moved into their scoped keys.
Subsequent users start fresh. The legacy keys are then deleted.

### Session layer (`js/auth/session.js`)

- Signed sessions: each session payload is signed with a per-install
  secret stored in `localStorage` (`jobTrackerInstallSecret`). Editing
  the session JSON in `sessionStorage` isn't enough to forge a valid
  session.
- Session TTL: **30 minutes of inactivity**. A heartbeat in `main.js`
  checks every 30s and logs out on expiry.
- **Session storage**: `sessionStorage` only for now. Closing the tab
  logs you out.
- **Rate limiting**: 5 failed login attempts → 5-minute lockout
  (persisted in `localStorage`). Rate limiting applies to login only,
  not registration.

### Profile seed and session sync

When a user registers, their `name` / `email` / `username` go into the
users registry. The config store starts with an empty `profile`. To
avoid showing blank fields in Settings → Profile right after
registering, `main.js` runs `seedProfileFromSession()` on boot: it
copies the name (split into first + last), email and username from the
session into `profile`, then marks `profile.seeded = true` so the seed
runs once per user and never overwrites manual edits.

When the user edits their profile and clicks Save, the config store
emits a `PROFILE_CHANGED` event. Two subscribers react:

1. `userMenu.js` re-renders the header dropdown so the new name shows
   up immediately.
2. `main.js` patches the current session in place (via
   `updateSessionProfile()`) so the header keeps the new name after a
   reload.

### Registering a new account

From the login screen's **Create account** tab. Fields:

- Username (3–30 chars, letters / numbers / `_` / `-`)
- Email
- Name (optional)
- Password (min 8, at least one letter and one number)
- Confirm password

On success the new user is automatically signed in and redirected to
`index.html`. Registration is always available once at least one user
exists, so multiple accounts can coexist on the same browser profile.

### Login screen stubs

- **Google / GitHub buttons** show an informative toast explaining that
  social sign-in is a local prototype. No account is created.
- **"Forgot your password?"** shows a toast explaining that, since this is
  a local multi-user environment, the password lives only in the current
  browser and cannot be recovered from the server (there is none).

### Backup & users

The export/import flow only covers **data** (jobs, referrals, config,
theme) — the user registry is intentionally left out. To move your
data to a new device, register a fresh account there and import your
backup file.

### Generating a password hash manually

If you ever need to seed an account from the console:

```js
const users = await import('./js/auth/users.js');
await users.createUser({
  username: 'me',
  email: 'me@example.com',
  name: 'Me',
  password: 'correct horse battery staple',
});
```

Or, to generate a hash without storing anything:

```js
const m = await import('./js/auth/users.js');
await m.computeHash('a7f3d9e2c4b8a1f6', 'YOUR_PASSWORD');
```

Never leave the plain password in the repo.

### Helper API (`js/auth/session.js`)

| Function | Purpose |
| --- | --- |
| `getSession()` | Returns the parsed session or `null` |
| `isValidSession(s)` | Verifies signature + expiry |
| `login({ userId, username, email, name })` | Creates and signs a session |
| `registerUser({ username, email, name, password })` | Creates the user and logs them in |
| `logout()` | Clears the session (keeps `ACTIVE_USER`) |
| `validateCredentials(id, pw)` | Looks the user up, checks the hash, updates rate limit |
| `getLockoutRemainingMs()` | Ms remaining until lockout expires |
| `getActiveUserId()` | Id of the last user who logged in |
| `updateSessionProfile({ name, email, username })` | Patches the session without re-signing |
| `computeHash(salt, pw)` | Re-exported from `users.js` |
| `requireSession(redirectTo)` | Guard for protected pages |
| `redirectIfAuthenticated(redirectTo)` | Guard for `login.html` |
| `startSessionHeartbeat(onExpire)` | Inactivity watchdog |

---

## Data model

Three stores (per user), each persisted under its own scoped key via the
`Store` class (`js/app/store.js`), which handles versioning and migrations.

| Store | Version | Contents |
| --- | --- | --- |
| `jobs` | 5 | Array of applications |
| `refs` | 5 | Array of referrals |
| `config` | 3 | User preferences |

### Application shape (abridged)

```js
{
  id, company, role, date, status,
  link, salary, hourlySalary, salaryIsRange, currency,
  workMode, hybridOfficeDays,
  contact, contactLink, contactPlatform,
  notes,
  skipped: [],           // step ids marked "not applicable"
  wentBack: false,       // only one backtrack allowed
  history: [{ status, date, reason?, note?, wentBack? }],
  offerConfirmed?: boolean
}
```

### Referral shape (abridged)

```js
{
  id, name, role, contact, link, relationship, status, notes,
  linkedCompanies: [],   // legacy field, no longer shown in UI
  linkedJobId: null,     // set by the "Referral → Application" flow
  wentBack: false,
  createdAt,
  history: [{ status, date, reason?, note?, wentBack? }]
}
```

### User shape (abridged)

```js
{
  id,             // UUID
  username,       // unique, case-insensitive
  email,          // unique, case-insensitive
  name,           // optional
  salt,           // hex
  passwordHash,   // SHA-256(salt:password), hex
  createdAt,
}
```

### Config shape (abridged)

```js
{
  lang, logo, background,
  dashboardStyleJobs, dashboardStyleRefs,
  profile: { firstName, lastName, username, email, bio, avatar, seeded },
  roles: { activeTags, hidden, custom, customTags },
  initialStatuses: [...],
  defaultInitialStatus: 'Applied',
  filters: [{ id, visible }]
}
```

### Migration

`js/app/migrations.js` owns every legacy → current conversion and is used
from three places:

- **Boot** — each `Store` receives a `migrate` function that runs once when a
  stored payload's version is older than the current one.
- **Backup import** — the Advanced panel routes imported data through the same
  functions so files exported by older builds keep working.
- **Legacy storage** — `migrateLegacyStorage(userId)` runs once per boot to
  move pre-multi-user payloads into the current user's scoped keys.

The schema migration pipeline:

- Backfills missing fields on legacy records.
- Maps legacy Spanish keys to English (`empresa` → `company`, `puesto` → `role`,
  `estado` → `status`, …).
- Maps legacy Spanish state values to English (`Guardado` → `Saved`,
  `Oferta` → `Offer`, `Pendiente` → `Pending`, …).
- Maps the legacy referral state `'Me va a referir'` → `'Contacted'`.
- Splits the old single `dashboardStyle` into `dashboardStyleJobs` +
  `dashboardStyleRefs`.
- Renames `profile.nombre`/`apellido` → `profile.firstName`/`lastName`.

Migrations run **once** on first load after upgrade, based on the version stamp
inside each stored payload. Old data is replaced in place — rolling back to a
pre-rename build after migration will not read the data correctly.

---

## Backup / Restore

From **Settings → Advanced**:

- **Export**: downloads a JSON file with jobs, referrals, config, and theme.
- **Import**: replaces all current data from a backup file. Validates the
  `app` field (`jobTracker`) and runs the migration pipeline before applying,
  so backups from older builds are upgraded on import.

Danger zone (all irreversible):

- **Reset preferences**: roles, statuses, filters, appearance → defaults. Data
  untouched.
- **Delete data**: wipes applications + referrals. Config untouched.
- **Reset everything**: config + data + theme → defaults.

Note: the user registry is **not** part of the backup. Restoring a backup on a
new device does not restore the accounts from the old one — you register a new
account and then import the data.

---

## Run

The app uses ES modules, so you need an HTTP server rather than opening
`index.html` directly (file:// will fail on CORS and on `<use>` external
sprite references).

```bash
npm start        # wraps: npx serve .
```

Then open the printed URL (usually `http://localhost:3000`).

There is no default account. On the first visit, register one from the
**Create account** tab.

---

## Tests

The pure modules (selectors, utils, migrations, store, users, icons, i18n,
validators) have a smoke test suite built on Node's built-in test runner —
no dependencies to install.

```bash
npm test
```

Requires **Node 20 or later** (uses `node --test`).

Expected output: everything green. The suite covers:

| File | Coverage |
| --- | --- |
| `tests/app/selectors.test.js` | Filters, sort, stats, dashboard helpers |
| `tests/app/utils.test.js` | `escapeHtml`, date helpers, `uid`, array helpers, `debounce` |
| `tests/app/migrations.test.js` | Schema migrations + legacy storage migration |
| `tests/app/store.test.js` | Persistence, subscribe, versioning, migration, subscriber isolation |
| `tests/app/constants.test.js` | Sprite names, workflow tables, defaults |
| `tests/app/icons.test.js` | Sprite reference emitter + name guard |
| `tests/app/validators.test.js` | Contact link, job payload and referral payload rules |
| `tests/auth/users.test.js` | User registry: hash, lookups, validation |
| `tests/auth/session.test.js` | Rate limiting, signing, session helpers |
| `tests/i18n/index.test.js` | Translations, interpolation, no residual emojis |

The test files stub `localStorage` (and, where relevant, `sessionStorage`)
with a small in-memory Map so they run in a plain Node environment, no
jsdom needed.

---

## Project structure

```
.
├── index.html                    # Main app shell
├── login.html                    # Sign-in / register screen
├── package.json                  # npm start / npm test
├── README.md
├── assets/
│   ├── favicon.svg
│   └── icons.svg                 # SVG sprite for every inline icon
├── js/
│   ├── main.js                   # Boot orchestration only
│   │
│   ├── app/                      # Infra + domain
│   │   ├── constants.js          # Workflow steps, states, defaults, options
│   │   ├── events.js             # Typed event bus
│   │   ├── icons.js              # icon() helper (sprite reference emitter)
│   │   ├── migrations.js         # Legacy → current + legacy storage → scoped
│   │   ├── selectors.js          # Pure state selectors
│   │   ├── store.js              # Reactive localStorage store w/ migrations,
│   │   │                         #   deep-frozen state, isolated subscribers
│   │   ├── undo.js               # withUndo() helper (structuredClone snapshots)
│   │   ├── utils.js              # Shared helpers (+ updateById, withHistoryEntry,
│   │   │                         #   debounce)
│   │   └── validators.js         # Pure form/payload validators
│   │
│   ├── i18n/                     # Translations
│   │   ├── index.js              # Public API (t, applyI18n, setLanguage…)
│   │   ├── es.js                 # Spanish dictionary
│   │   └── en.js                 # English dictionary
│   │
│   ├── auth/                     # Mock auth
│   │   ├── login.js              # Login screen entry point
│   │   ├── users.js              # Local user registry (hash + salt)
│   │   └── session.js            # Session signing, guards, active-user helper
│   │
│   ├── boot/                     # Startup side-effects
│   │   ├── firstRun.js           # First-run welcome banner
│   │   ├── i18nPulse.js          # Cascade animation on language change
│   │   ├── keyboard.js           # Shortcuts (n, /)
│   │   ├── stores.js             # Instantiates the three scoped stores
│   │   ├── theme.js              # Theme toggle, ripple, brand logo
│   │   └── userMenu.js           # Header dropdown wiring
│   │
│   ├── controllers/              # Feature controllers
│   │   ├── jobsController.js     # List + form + dashboard
│   │   ├── refsController.js     # List + form + dashboard
│   │   ├── createRoleController.js
│   │   │
│   │   ├── modals/               # Per-modal controllers
│   │   │   ├── index.js          # Facade
│   │   │   ├── editJobModal.js
│   │   │   ├── editRefModal.js
│   │   │   ├── closeJobModal.js
│   │   │   ├── historyModal.js
│   │   │   ├── noteModal.js      # Jobs — thin wrapper on the factory
│   │   │   ├── noteModalFactory.js # Shared lifecycle for jobs + refs notes
│   │   │   └── refToJobModal.js
│   │   │
│   │   └── config/               # Per-tab controllers
│   │       ├── index.js          # Facade + draft lifecycle + reset flows
│   │       ├── rolesPanel.js
│   │       ├── statusesPanel.js
│   │       ├── filtersPanel.js
│   │       ├── appearancePanel.js
│   │       ├── dashboardPanel.js
│   │       ├── languagePanel.js
│   │       ├── profilePanel.js
│   │       └── advancedPanel.js
│   │
│   ├── templates/                # Card renderers (pure HTML strings)
│   │   ├── icon.js               # Re-export of app/icons.js
│   │   ├── jobCard.js
│   │   ├── refCard.js
│   │   └── steps.js
│   │
│   └── ui/                       # UI widgets
│       ├── modal.js              # Shared lifecycle: escape stack,
│       │                         #   focus trap, focus restoration
│       ├── dragDrop.js           # mountDragDrop() — reorderable list helper
│       ├── toolbarFilter.js      # mountToolbarFilter() — filter chip bar
│       ├── dashboard.js          # Re-export shim for dashboard/index.js
│       ├── dashboard/            # Six dashboard styles
│       │   ├── index.js
│       │   ├── shared.js
│       │   ├── sparklines.js
│       │   ├── modular.js
│       │   ├── minimal.js
│       │   ├── compact.js
│       │   ├── circular.js
│       │   └── heatmap.js
│       ├── form/
│       │   ├── chips.js
│       │   ├── combo.js
│       │   ├── contactLinkPicker.js
│       │   ├── currencyPicker.js
│       │   ├── datePicker.js
│       │   ├── inputLimits.js
│       │   ├── salaryInput.js
│       │   ├── salaryModeChip.js
│       │   ├── statusCombo.js
│       │   └── workModePicker.js
│       └── feedback/
│           ├── confirmModal.js
│           ├── resetAnimation.js
│           └── toast.js          # role="status" + aria-live="polite"
├── css/
│   ├── styles.css                # @imports only — the CSS entry point
│   ├── base/
│   │   ├── tokens.css            # Variables (light + dark)
│   │   ├── reset.css             # *, html, body, .container, .is-hidden,
│   │   │                         #   :focus-visible global ring
│   │   ├── motion.css            # @media (prefers-reduced-motion: reduce)
│   │   └── print.css             # @media print
│   ├── themes/
│   │   └── backgrounds.css       # 11 animated/static backgrounds
│   ├── layout/
│   │   ├── header.css
│   │   ├── user-menu.css
│   │   └── responsive.css
│   ├── components/
│   │   ├── buttons.css
│   │   ├── forms.css             # Inputs scoped to .field
│   │   ├── datepicker.css
│   │   ├── toolbar.css
│   │   ├── modals.css
│   │   ├── feedback.css
│   │   ├── empty-state.css
│   │   └── welcome.css
│   ├── features/
│   │   ├── jobs.css
│   │   ├── referrals.css
│   │   ├── workflow.css
│   │   ├── history.css
│   │   ├── dashboard.css
│   │   └── config.css            # @imports only, pulls from ./config/
│   │       └── config/
│   │           ├── base.css      # modal shell, nav, layout, buttons
│   │           ├── panels.css    # roles, statuses, filters, appearance,
│   │           │                 #   language
│   │           ├── profile.css   # profile panel + spacing tweaks
│   │           ├── advanced.css  # backup, danger zone, unsaved modal
│   │           └── mobile.css    # 4×2 tab grid + stacked cards
│   └── pages/
│       ├── auth.css
│       └── boot.css
└── tests/
    ├── app/
    │   ├── constants.test.js
    │   ├── icons.test.js
    │   ├── migrations.test.js
    │   ├── selectors.test.js
    │   ├── store.test.js
    │   ├── utils.test.js
    │   └── validators.test.js
    ├── auth/
    │   ├── session.test.js
    │   └── users.test.js
    └── i18n/
        └── index.test.js
```

---

## Architecture notes

A few conventions that have grown over time and are worth knowing before
editing:

### JavaScript

- **`app/` is the domain + infra layer.** It contains the constants, the
  store, the selectors, the migrations, the utils, the event bus, the icons
  helper, the validators and the undo helper. Nothing in `app/` imports
  from `ui/`, `controllers/`, or `boot/` — the dependency direction is
  one-way.
- **`main.js` orchestrates, `boot/*` does the work.** Adding a new
  cross-cutting concern (shortcuts, a service worker, telemetry) usually
  means a new file in `js/boot/` and one call from `main.js`.
- **i18n is one interface, two dictionaries.** Consumers keep importing
  from `js/i18n/index.js`. The ES/EN content lives in
  `js/i18n/{es,en}.js`. Adding a language is one new file + one entry in
  `SUPPORTED_LANGS`.
- **State derivations live in `app/selectors.js`.** Filters, sorts,
  statistics, weekly trends, top-N helpers — anything pure that reads
  from state and returns new data. Controllers call selectors, not the
  other way around.
- **Validators live in `app/validators.js`.** `validateJobPayload`,
  `validateRefPayload`, `validateContactLink` and the `LINK_VALIDATORS`
  table are pure functions that return `{ valid, errorKey?, field? }`.
  Controllers only orchestrate the side effects (focus, toast, mark
  touched); they never reimplement the rules.
- **Dashboard styles are pluggable.** Each style is a function that
  receives a container and a data object and renders into it. Adding a
  style is one new file in `js/ui/dashboard/` plus a switch case in
  `index.js`.
- **Controllers are split by concern when a file grows past ~300 lines.**
  `modalsController` and `configController` became directories with one
  file per modal / per tab plus a small facade.
- **Reusable UI helpers live in `ui/`.** `mountDragDrop()` and
  `mountToolbarFilter()` are standalone helpers: any list that needs
  drag-to-reorder or a chip bar can mount them. Controllers pass a
  selector + an `onReorder` / `onChange` callback and receive a tiny
  handle with `destroy()` / `render()` / `getFilter()` / `setFilter()`.
- **Panels never hold a reference to the draft.** In the config split,
  each panel receives a `host` object and calls `host.getDraft()` on
  every read. That way a wholesale draft replacement (from Reset
  preferences) is picked up on the next `render()` without the panel
  needing to know.
- **UI widgets live under `ui/` by concern:** `ui/form/` for form
  widgets, `ui/feedback/` for overlays, `ui/dashboard/` for the
  dashboards. `ui/modal.js`, `ui/dragDrop.js`, `ui/toolbarFilter.js`
  and `ui/dashboard.js` (a backward-compatible re-export shim for
  `ui/dashboard/index.js`) sit at the root of `ui/`.
- **Note modals share one lifecycle.** Jobs and referrals both use
  `createNoteModalController()` from
  `controllers/modals/noteModalFactory.js`. Each caller supplies its own
  DOM elements, builds its own subtitle HTML and provides the mutation
  to run on apply. The factory owns the disabled-until-non-whitespace
  rule, the escape hatch ("Continue without note"), the close X and
  Escape handling. No duplicated markup or JS between the two note
  modals.
- **Modals use a shared lifecycle.** Every overlay goes through
  `createModal(el, opts)` from `js/ui/modal.js`, which handles:
  - open / close and overlay-click-to-close,
  - a module-level Escape stack (only the top-most modal reacts),
  - **focus trap**: `Tab` / `Shift+Tab` stay inside the top-most modal,
  - **focus restoration**: the element that opened the modal regains
    focus on close (when still present in the DOM),
  - **auto-focus**: the first focusable element is focused on open,
    unless `onOpen` already focused something.
  Widgets that consume Escape themselves — the role picker and the
  status picker — call `e.stopPropagation()` so the parent modal doesn't
  also close.
- **Events are typed.** Cross-module signals go through
  `js/app/events.js`. Raw `document.dispatchEvent(new CustomEvent(...))`
  calls are not allowed outside that file. Current events:
  `scroll-to-job`, `scroll-to-ref`, `i18n-changed`, `profile-changed`.
- **Every migration is a pure function.** `migrateJob`, `migrateRef`,
  `migrateConfig` take an old-shaped object and return a current-shaped
  one. They're used both at boot and at backup import — that keeps the
  two paths in sync automatically.
- **Undo is single-slot.** `js/app/undo.js` snapshots one or more stores
  before running a mutation and shows an action toast with a 5-second
  window. Snapshots use `structuredClone` with a JSON fallback, so
  mutating the store after the snapshot can never leak into the undo
  buffer. Starting a new action dismisses the previous toast so users
  never restore an intermediate state.
- **The store is deep-frozen on every write.** `Store.get()` returns an
  object graph where every node has been passed through `deepFreeze()`.
  A mutation like `store.get()[0].status = 'X'` throws in strict mode
  (ES modules are strict by default) instead of silently breaking
  persistence and notifications. The cost is negligible for the sizes
  this app handles (dozens to hundreds of items).
- **The store isolates subscriber errors.** `#emit()` wraps every
  subscriber call in `try/catch`, so a bug in one subscriber can't stop
  the others from running.
- **Shared mutation helpers.** `updateById(store, id, patchFn)` and
  `withHistoryEntry(item, patch, entry)` (both in `utils.js`) cover the
  two most common store mutations. `debounce(fn, ms)` covers input
  handlers — it returns a function with a `.cancel()` method.

### CSS

- **Only `css/styles.css` is loaded by the HTML.** Everything else is
  pulled in via `@import` from that file. The load order (documented at
  the top of the file) matters: tokens first (defines the variables),
  then reset, then everything else.
- **Folders mirror the JS organization:**
  - `base/` — document-wide rules (variables, reset, reduced-motion, print).
  - `themes/` — visual themes applied to `body` (backgrounds).
  - `layout/` — page structure (header, user menu, media queries).
  - `components/` — reusable widgets (buttons, forms, modals, feedback,
    empty states).
  - `features/` — domain-specific (jobs, referrals, workflow, dashboard,
    config, history).
  - `pages/` — full-page layouts (login screen, boot overlay).
- **`config.css` is a barrel file.** It only contains `@import`
  statements pointing at `./config/{base,panels,profile,advanced,mobile}.css`.
  The order matters:
  1. `base` — modal shell, nav, layout, generic buttons.
  2. `panels` — role, status, filter, appearance and language pickers.
  3. `profile` — profile panel fields and spacing tweaks.
  4. `advanced` — backup card, danger zone, unsaved modal.
  5. `mobile` — responsive overrides. **Must come last** so the media
     queries win over the desktop rules without `!important`.
- **CSS custom properties drive everything.** Light/dark themes are a
  swap of variables on `:root` / `[data-theme="dark"]`. Components never
  hard-code colors — they reference variables.
- **Relationship colors use custom properties.** Referral cards and
  relationship badges share a single set of per-relationship variables
  (`--r-stripe-a/b`, `--r-badge-bg/fg/bd`) defined on
  `[data-relationship="…"]`. Adding a new relationship is one block of
  five variables + one dark override, no duplicated selectors.
- **Utility classes are shared.** `.is-hidden` (toggles `display: none`)
  is toggled by JS instead of inline `style.display`. Adding new utility
  classes is fine, but keep them minimal and documented in
  `base/reset.css`.
- **Form inputs are scoped to `.field`.** Only inputs inside a
  `<div class="field">` get the full-width padded look from
  `components/forms.css`. Component inputs (search boxes, prefix
  wrappers, salary wrapper, the datepicker trigger, etc.) define their
  own styles from scratch instead of resetting the global rule. When
  adding a new input outside a form field, remember it will have no
  padding, border or background until you give it one.
- **Responsive media queries cascade cleanly.** Global layout queries live
  in `layout/responsive.css`. Component-specific mobile rules that would
  otherwise be overridden by desktop rules due to the `@import` order live
  at the bottom of their own feature file (e.g.
  `features/config/mobile.css`) so they win cleanly without `!important`.

### Assets

- **Every icon lives in `assets/icons.svg`** as a `<symbol>`. Reference
  it anywhere with:
  ```html
  <svg viewBox="0 0 24 24"><use href="./assets/icons.svg#icon-name"/></svg>
  ```
- **No emojis in the chrome.** Every button, tab, badge and card
  accent uses the sprite. The only text glyphs left are typographic:
  the `✓` / `—` / step number inside workflow dots, and the `—` / `+`
  in the heatmap legend.
- The `<use href>` uses the **document** path (relative to the HTML file),
  not the module path. Templates that inject HTML into `index.html` use
  the same relative URL.
- Icons inherit `currentColor`, so they follow light/dark theme, hover
  state and any per-element color. The sprite does **not** set
  `stroke-width` on its paths, which means per-component `stroke-width`
  rules in CSS (`.icon-btn svg`, `.action-btn svg`, …) win on inheritance.
- Because the sprite is external, the app **must** be served over HTTP.
  `file://` will fail silently (icons won't render). This is the same
  constraint that ES modules already impose.

### General

- **No build step.** Everything ships as-is over HTTP. Avoid adding a
  bundler or TypeScript unless the scope grows significantly.
- **File size**: aim for under ~500 lines per file. When a module grows
  past that, split by concern rather than by size.

---

## Coding conventions

- **Language**: all identifiers, comments, and internal log messages are in
  English. User-facing strings live in `js/i18n/{es,en}.js` — that's the only
  place Spanish is allowed.
- **Data keys**: everything stored in `localStorage` uses English keys
  (`company`, `role`, `status`, `date`, …) and English values for enum-like
  fields (`Saved`, `Applied`, `Offer`, `Pending`, `Hired`, …).
- **CSS**: class names and any `data-*` attributes are English
  (`data-status`, `data-relationship`, `.workmode-seg`, `.currency-chip`, …).
- **CSS class naming**: kebab-case, block-scoped (`.job-card-header`,
  `.config-tab`). Variants use a modifier class (`.modal-sm`, `.is-hidden`).
- **Modifiers over new classes.** When a component needs a variant, add a
  modifier class instead of a new BEM block. E.g. `.modal-close.ghost`
  (transparent close button used by the config and unsaved modals)
  instead of separate `.config-close` / `.unsaved-close`.
- **Emitting icons from JS.** Use the shared `icon(name, className)`
  helper from `js/app/icons.js` (re-exported from `js/templates/icon.js`
  and `js/ui/dashboard/shared.js`). It runs the name through
  `^icon-[a-z0-9-]+$` before emitting the sprite reference, so no
  state-derived string can inject arbitrary markup.
- **`data-i18n-html` strings never contain `{placeholder}`.** `applyI18n`
  does not pass params to `t()` for HTML attributes, so a leftover
  placeholder shows up as literal text. All the templated strings that
  need params (confirm dialogs, etc.) go through `t(key, params)`
  directly instead.
- **Announce transient UI.** Anything users need to notice without moving
  focus — toasts, status messages, undo prompts — carries
  `role="status"` and `aria-live="polite"`. `aria-atomic="true"` ensures
  the whole message is read, not just the changed part.
- **Never store a mutable reference to `store.get()`.** The store is
  deep-frozen; the update path is always
  `store.update(current => nextValue)`. If you need to keep the current
  value around, deep-clone it explicitly (`structuredClone`).

---

## Notes on security

The auth layer is **client-side only** and exists to gate the UI, not to
protect data. Anyone who opens DevTools can:

- Read the password hashes from `localStorage` (SHA-256 with a per-user
  salt raises the bar a little, but the salt is stored next to the hash).
- Forge a session by re-signing it — the install secret lives in
  `localStorage` and is readable.
- Skip the guards entirely by setting `sessionStorage` manually.
- Register as many accounts as they want — there's no server-side gate.
- Read another user's jobs / refs / config by inspecting the scoped
  keys directly. The isolation is a UX convenience, not a security
  boundary.

When a backend is ready, replace:

- `validateCredentials()` → `POST /auth/login`
- `registerUser()` → `POST /auth/register`
- `login()` → store a server-issued httpOnly cookie
- `requireSession()` → `GET /auth/me`
- `startSessionHeartbeat()` → rely on server-side session expiry
- Per-user storage keys → server-side rows scoped to the session user