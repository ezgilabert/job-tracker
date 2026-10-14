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
- **Stage workflow**: Saved → Applied → Contact → HR Interview →
  Technical Challenge → Live Coding → Technical Interview → Client Interview →
  Client Chat → Final Interview → References → Negotiation → Offer.
- **Close with a reason**: Rejected, Ghosted, Discarded, Offer. Each close
  state comes with preset reason chips (localized) and a free-text field.
- **Advance with a note**: when moving a stage forward you can leave a reminder
  for that step (shown as a "PD" on the card).
- **Skip a stage**: mark the current step as "Not applicable" and jump to the
  next one.
- **Go back once**: you can move a stage back a single time per application.
- **Reopen** closed applications.
- **Drag & drop** to reorder cards.
- **History modal** with a timeline of every stage change, note, and reason.
- **Filters** by status (configurable order and visibility) + free-text search
  across company, role, contact, notes, and salary.
- **Salary input** with auto-formatted mask, range/single toggle, ARS/USD
  currency picker, and hourly/monthly toggle.
- **Work mode picker**: On-site / Remote / Hybrid (with office days).
- **Contact picker**: LinkedIn / Email / WhatsApp / Other, with per-platform
  validation and one-click actions on the card.

### Referrals (refs)

- Create, edit, and delete referrals: name, role, contact, link, relationship,
  status, notes.
- **Own workflow**: Pending → Contacted → Referred → In Process → Hired
  (or Not applicable).
- **Referral → application flow**: when a referral reaches "In Process", a modal
  offers to either create a new application (pre-filled) or link it to an
  existing one. The link is stored internally as `linkedJobId`.
- **Auto-sync**: when the linked application is closed as "Offer", the referral
  moves to "Hired" (and vice versa).
- **History modal** with the same timeline treatment as jobs.
- **Filters by status** + free-text search across name, role, contact, notes.

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

Each dashboard is wrapped in a header ("Applications" / "Referrals") so the
two are visually distinguishable.

### Configuration modal

Eight tabs, all changes staged as a draft and applied on Save:

- **Roles** — enable/disable role categories, add custom roles, hide/restore.
- **Initial statuses** — pick which statuses appear in the dropdown and which
  one is default.
- **Filters** — reorder and show/hide the filter chips.
- **Appearance** — logo (2 options) and background (11 options: aurora, mesh,
  grid, dots, waves, conic, noise, stripes, cosmos, blobs, none).
- **Dashboard** — pick a style for jobs and another for referrals.
- **Language** — ES / EN.
- **Profile** — first name, last name, username, email, bio, avatar (stored as
  dataURL).
- **Advanced** — export/import JSON backup, plus three danger-zone actions:
  reset preferences, delete data, reset everything.

An unsaved-changes badge appears whenever the draft differs from the saved
state, and closing prompts to discard or save.

### Appearance & UX

- Light / dark theme with a radial ripple animation on toggle.
- Eleven animated/static background styles.
- Toast notifications, custom confirm modals, and a progress-ring reset
  animation.
- **Undo for destructive actions** — delete, advance and close actions show a
  5-second toast with an "Undo" button and a countdown bar. Only the most
  recent action stays undoable; starting a new one dismisses the previous
  toast so the user never restores an intermediate state.
- **First-run welcome banner** — teaches the keyboard shortcuts, drag-to-
  reorder and where Settings lives. Dismissed once and never shown again.
- All UI is fully internationalized (Spanish / English). Reason chips, empty
  states, and every label come from the dictionary — no hardcoded strings.
- Empty states are SVG-based, not emoji: clipboard for jobs, link for
  referrals, funnel for "no results in this filter".
- Card action buttons (edit / delete) use SVG icons with a soft-square style.
- **Keyboard shortcuts**:
  - `n` — expand the "New application" section and focus the Company field.
  - `/` — focus the applications search box.
  - `Esc` — close any open modal.
- **Print / PDF export** — hides all interactive chrome and renders the two
  lists (applications + referrals) as a clean, printable document. Links keep
  their URLs in parentheses for reference. Available from the user menu.

---

## Authentication

Single-user, client-side mock. **Not real security** — anyone with DevTools can
bypass it. It's "raising the bar" until a backend exists.

- Credentials are checked against a hard-coded **SHA-256 hash** in
  `js/auth/session.js` (salt + password).
- **Rate limiting**: 5 failed attempts → 5-minute lockout (persisted in
  `localStorage`).
- **Signed sessions**: each session is signed with a per-install secret stored
  in `localStorage` (`jobTrackerInstallSecret`). Editing the session JSON in
  `sessionStorage` isn't enough to forge a valid session.
- **Session TTL**: 30 minutes of inactivity. A heartbeat in `main.js` checks
  every 30s and logs out on expiry.
- **Session storage**: currently `sessionStorage` only. Closing the tab logs
  you out. (`localStorage` for "remember me" is planned but not implemented.)
- The header has a **Sign out** button that clears the session and returns to
  `login.html`.

### Register tab

The **Create account** tab exists in the UI but is disabled: submitting shows a
message telling the user to ask the administrator for access.

### How the guards work

- `login.html` runs `await redirectIfAuthenticated('./index.html')` on boot. If
  a valid session exists, it redirects.
- `index.html` runs `await requireSession('./login.html')` before mounting the
  app. If no valid session exists, it redirects.
- `logout()` clears the session from both storages.

### Generating a new password hash

From the login page's DevTools console:

```js
const m = await import('./js/auth/session.js');
await m.computeHash('a7f3d9e2c4b8a1f6', 'YOUR_PASSWORD');
```

Paste the resulting hex into `CREDENTIALS[].passwordHash` in
`js/auth/session.js`. Never leave the plain password in the repo.

### Helper API (`js/auth/session.js`)

| Function | Purpose |
| --- | --- |
| `getSession()` | Returns the parsed session or `null` |
| `isValidSession(s)` | Verifies signature + expiry |
| `login({ username, email, name })` | Creates and signs a session |
| `logout()` | Clears the session |
| `validateCredentials(id, pw)` | Checks against the hash, updates rate limit |
| `getLockoutRemainingMs()` | Ms remaining until lockout expires |
| `computeHash(salt, pw)` | Utility for generating password hashes |
| `requireSession(redirectTo)` | Guard for protected pages |
| `redirectIfAuthenticated(redirectTo)` | Guard for `login.html` |
| `startSessionHeartbeat(onExpire)` | Inactivity watchdog |

---

## Data model

Three stores, each persisted under its own key via the `Store` class
(`js/app/store.js`), which handles versioning and migrations.

| Key | Store | Version | Contents |
| --- | --- | --- | --- |
| `jobTrackerV2` | `jobs` | 5 | Array of applications |
| `jobTrackerReferrals` | `refs` | 5 | Array of referrals |
| `jobTrackerConfig` | `config` | 3 | User preferences |
| `jobTrackerTheme` | — | — | `'light'` \| `'dark'` |

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

### Config shape (abridged)

```js
{
  lang, logo, background,
  dashboardStyleJobs, dashboardStyleRefs,
  profile: { firstName, lastName, username, email, bio, avatar },
  roles: { activeTags, hidden, custom, customTags },
  initialStatuses: [...],
  defaultInitialStatus: 'Applied',
  filters: [{ id, visible }]
}
```

### Migration

`js/app/migrations.js` owns every legacy → current conversion and is used from
two places:

- **Boot** — each `Store` receives a `migrate` function that runs once when a
  stored payload's version is older than the current one.
- **Backup import** — `configController` routes imported data through the same
  functions so files exported by older builds keep working.

The migration pipeline:

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

---

## Run

The app uses ES modules, so you need an HTTP server rather than opening
`index.html` directly (file:// will fail on CORS).

```bash
npm start        # wraps: npx serve .
```

Then open the printed URL (usually `http://localhost:3000`).

Default credentials for the mock sign-in are in `js/auth/session.js`. Change
the hash before shipping anything to a real user.

---

## Tests

The pure modules (selectors, utils, migrations, store) have a smoke test suite
built on Node's built-in test runner — no dependencies to install.

```bash
npm test
```

Requires **Node 20 or later** (uses `node --test`).

Expected output: everything green. The suite covers:

| File | Coverage |
| --- | --- |
| `tests/selectors.test.js` | Filters, sort, stats, dashboard helpers |
| `tests/utils.test.js` | `escapeHtml`, date helpers, `uid`, array helpers |
| `tests/migrations.test.js` | Every legacy → current schema map |
| `tests/store.test.js` | Persistence, subscribe, versioning, migration |

The test files stub `localStorage` (a small in-memory Map) so they run in a
plain Node environment, no jsdom needed.

---

## Project structure

```
.
├── index.html                    # Main app shell
├── login.html                    # Sign-in screen
├── favicon.svg
├── package.json                  # npm start / npm test
├── README.md
├── js/
│   ├── main.js                   # Boot orchestration only (~120 lines)
│   │
│   ├── app/                      # Infra + domain
│   │   ├── constants.js          # Workflow steps, states, defaults, options
│   │   ├── events.js             # Typed event bus (scroll-to-*, i18n-changed)
│   │   ├── migrations.js         # Legacy → current schema maps
│   │   ├── selectors.js          # Pure state selectors (filters, stats, trends)
│   │   ├── store.js              # Reactive localStorage store w/ migrations
│   │   ├── undo.js               # withUndo() helper
│   │   └── utils.js              # Shared helpers (escapeHtml, dates, valueOf…)
│   │
│   ├── i18n/                     # Translations
│   │   ├── index.js              # Public API (t, applyI18n, setLanguage…)
│   │   ├── es.js                 # Spanish dictionary
│   │   └── en.js                 # English dictionary
│   │
│   ├── auth/                     # Mock auth
│   │   ├── login.js              # Login screen entry point
│   │   └── session.js            # Session signing, guards
│   │
│   ├── boot/                     # Startup side-effects
│   │   ├── firstRun.js           # First-run welcome banner
│   │   ├── i18nPulse.js          # Cascade animation on language change
│   │   ├── keyboard.js           # Shortcuts (n, /)
│   │   ├── stores.js             # Instantiates the three stores
│   │   ├── theme.js              # Theme toggle, ripple, brand logo
│   │   └── userMenu.js           # Header dropdown wiring
│   │
│   ├── controllers/              # Feature controllers
│   │   ├── jobsController.js
│   │   ├── refsController.js
│   │   ├── modalsController.js
│   │   ├── configController.js
│   │   └── createRoleController.js
│   │
│   ├── templates/                # Card renderers (pure HTML strings)
│   │   ├── jobCard.js
│   │   ├── refCard.js
│   │   └── steps.js
│   │
│   └── ui/                       # UI widgets
│       ├── dashboard/            # Six dashboard styles
│       │   ├── index.js          # Dispatcher + header wrapper
│       │   ├── shared.js         # uid, sparkPath, summary
│       │   ├── sparklines.js
│       │   ├── modular.js
│       │   ├── minimal.js
│       │   ├── compact.js
│       │   ├── circular.js
│       │   └── heatmap.js
│       ├── form/                 # Form widgets
│       │   ├── chips.js
│       │   ├── combo.js          # Role picker
│       │   ├── contactLinkPicker.js
│       │   ├── currencyPicker.js
│       │   ├── datePicker.js
│       │   ├── inputLimits.js
│       │   ├── salaryInput.js
│       │   ├── salaryModeChip.js
│       │   ├── statusCombo.js    # Status picker
│       │   └── workModePicker.js
│       └── feedback/             # Overlays
│           ├── confirmModal.js
│           ├── resetAnimation.js
│           └── toast.js
├── css/
│   ├── styles.css                # @imports only
│   ├── tokens.css                # CSS variables (light + dark)
│   ├── reset.css                 # *, html, body, .container
│   ├── header.css                # header, brand, icon buttons
│   ├── user-menu.css             # Dropdown, ripple, highlight pulse
│   ├── backgrounds.css
│   ├── dashboard.css
│   ├── forms.css
│   ├── buttons.css
│   ├── toolbar.css
│   ├── jobs.css
│   ├── workflow.css
│   ├── datepicker.css
│   ├── referrals.css
│   ├── modals.css
│   ├── history.css
│   ├── config.css
│   ├── feedback.css
│   ├── welcome.css
│   ├── responsive.css
│   ├── auth.css
│   └── print.css
└── tests/
    ├── selectors.test.js
    ├── utils.test.js
    ├── migrations.test.js
    └── store.test.js
```

---

## Architecture notes

A few conventions that have grown over time and are worth knowing before
editing:

- **`app/` is the domain + infra layer.** It contains the constants, the
  store, the selectors, the migrations, the utils, the event bus, and the
  undo helper. Nothing in `app/` imports from `ui/`, `controllers/`, or
  `boot/` — the dependency direction is one-way.
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
- **Dashboard styles are pluggable.** Each style is a function that
  receives a container and a data object and renders into it. Adding a
  style is one new file in `js/ui/dashboard/` plus a switch case in
  `index.js`.
- **UI widgets live under `ui/` by concern:** `ui/form/` for form
  widgets, `ui/feedback/` for overlays, `ui/dashboard/` for the
  dashboards. Nothing UI-related sits at the root of `js/ui/`.
- **Events are typed.** Cross-module signals go through `js/app/events.js`.
  Raw `document.dispatchEvent(new CustomEvent(...))` calls are not
  allowed outside that file.
- **Every migration is a pure function.** `migrateJob`, `migrateRef`,
  `migrateConfig` take an old-shaped object and return a current-shaped
  one. They're used both at boot and at backup import — that keeps the
  two paths in sync automatically.
- **Undo is single-slot.** `js/app/undo.js` snapshots one or more stores
  before running a mutation and shows an action toast with a 5-second
  window. Starting a new action dismisses the previous toast so users
  never restore an intermediate state.

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
- **File size**: aim for under ~500 lines per file. When a module grows past
  that, split by concern rather than by size.
- **No build step**: everything ships as-is over HTTP. Avoid adding a bundler
  or TypeScript unless the scope grows significantly.

---

## Notes on security

The auth layer is **client-side only** and exists to gate the UI, not to
protect data. Anyone who opens DevTools can:

- Read the password hash from the bundle (it's SHA-256, so pre-image resistance
  helps a little, but the salt is also in the bundle).
- Forge a session by re-signing it — the install secret lives in
  `localStorage` and is readable.
- Skip the guards entirely by setting `sessionStorage` manually.

When a backend is ready, replace:

- `validateCredentials()` → `POST /auth/login`
- `login()` → store a server-issued httpOnly cookie
- `requireSession()` → `GET /auth/me`
- `startSessionHeartbeat()` → rely on server-side session expiry