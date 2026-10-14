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

---

## Authentication

Single-device mock. **Not real security** — anyone with DevTools can bypass
it. It's "raising the bar" until a backend exists.

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
| `verifyPassword(user, password)` | Constant-time-ish compare |
| `validateRegistration({ ... })` | Field-level validation, returns i18n keys |
| `computeHash(salt, pw)` | Utility |
| `deleteUser(id)` | Removes a record |

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
| `login({ username, email, name })` | Creates and signs a session |
| `registerUser({ username, email, name, password })` | Creates the user and logs them in |
| `logout()` | Clears the session |
| `validateCredentials(id, pw)` | Looks the user up, checks the hash, updates rate limit |
| `getLockoutRemainingMs()` | Ms remaining until lockout expires |
| `computeHash(salt, pw)` | Re-exported from `users.js` |
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
| `jobTrackerUsers` | — | — | Array of user accounts |
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

The pure modules (selectors, utils, migrations, store, users, i18n) have a
smoke test suite built on Node's built-in test runner — no dependencies to
install.

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
| `tests/users.test.js` | User registry: hash, lookups, validation |
| `tests/constants.test.js` | Sprite names, workflow tables, defaults |
| `tests/i18n.test.js` | Translations, interpolation, no residual emojis |

The test files stub `localStorage` (a small in-memory Map) so they run in a
plain Node environment, no jsdom needed.

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
│   ├── main.js                   # Boot orchestration only (~120 lines)
│   │
│   ├── app/                      # Infra + domain
│   │   ├── constants.js          # Workflow steps, states, defaults, options
│   │   ├── events.js             # Typed event bus (scroll-to-*, i18n-changed)
│   │   ├── icons.js              # icon() helper, sprite reference emitter
│   │   ├── migrations.js         # Legacy → current schema maps
│   │   ├── selectors.js          # Pure state selectors (filters, stats, trends)
│   │   ├── store.js              # Reactive localStorage store w/ migrations
│   │   ├── undo.js               # withUndo() helper
│   │   └── utils.js              # Shared helpers (+ updateById, withHistoryEntry)
│   │
│   ├── i18n/                     # Translations
│   │   ├── index.js              # Public API (t, applyI18n, setLanguage…)
│   │   ├── es.js                 # Spanish dictionary
│   │   └── en.js                 # English dictionary
│   │
│   ├── auth/                     # Mock auth
│   │   ├── login.js              # Login screen entry point
│   │   ├── users.js              # Local user registry (hash + salt)
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
│   │   ├── icon.js               # Re-export of app/icons.js
│   │   ├── jobCard.js
│   │   ├── refCard.js
│   │   └── steps.js
│   │
│   └── ui/                       # UI widgets
│       ├── modal.js              # Shared modal lifecycle + Escape stack
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
│           └── toast.js
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
│   │   └── config.css
│   └── pages/
│       ├── auth.css
│       └── boot.css
└── tests/
    ├── selectors.test.js
    ├── utils.test.js
    ├── migrations.test.js
    ├── store.test.js
    ├── users.test.js
    ├── constants.test.js
    └── i18n.test.js
```

---

## Architecture notes

A few conventions that have grown over time and are worth knowing before
editing:

### JavaScript

- **`app/` is the domain + infra layer.** It contains the constants, the
  store, the selectors, the migrations, the utils, the event bus, the icons
  helper and the undo helper. Nothing in `app/` imports from `ui/`,
  `controllers/`, or `boot/` — the dependency direction is one-way.
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
  dashboards. Nothing UI-related sits at the root of `js/ui/` except
  `modal.js` (the shared modal lifecycle, which is a cross-cutting
  primitive, not a component).
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
- **Shared mutation helpers.** `updateById(store, id, patchFn)` and
  `withHistoryEntry(item, patch, entry)` (both in `utils.js`) cover the
  two most common store mutations. Both are used across the three
  controllers instead of hand-rolled `store.update(items => items.map(…))`.
- **Modals use a shared lifecycle.** Every overlay goes through
  `createModal(el, opts)` from `js/ui/modal.js`, which handles open /
  close, overlay-click-to-close and a module-level Escape stack (only
  the top-most modal reacts). Widgets that consume Escape themselves —
  the role picker and the status picker — call `e.stopPropagation()`
  so the parent modal doesn't also close.

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

### Assets

- **Every icon lives in `assets/icons.svg`** as a `<symbol>`. Reference
  it anywhere with:
  ```html
  <svg viewBox="0 0 24 24"><use href="./assets/icons.svg#icon-name"/></svg>
  ```
- **No emojis in the chrome.** Every button, tab, badge and card
  accent uses the sprite. The only text glyphs left are typographic:
  the `✓` / `—` / step number inside workflow dots, and the `—` / `+`
  in the heatmap legend. Those read as characters, not icons, so they
  don't belong in the sprite.
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
- **File size**: aim for under ~500 lines per file. When a module grows past
  that, split by concern rather than by size.
- **No build step**: everything ships as-is over HTTP. Avoid adding a bundler
  or TypeScript unless the scope grows significantly.

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

When a backend is ready, replace:

- `validateCredentials()` → `POST /auth/login`
- `registerUser()` → `POST /auth/register`
- `login()` → store a server-issued httpOnly cookie
- `requireSession()` → `GET /auth/me`
- `startSessionHeartbeat()` → rely on server-side session expiry