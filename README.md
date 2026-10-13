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
- **Stage workflow**: Guardado → Aplicado → Contacto → Entrevista RRHH →
  Challenge técnico → Live coding → Entrevista Técnica → Entrevista con cliente →
  Charla con cliente → Entrevista Final → Referencias → Negociación → Oferta.
- **Close with a reason**: Rechazado, Ghosted, Descartado, Oferta. Each close
  state comes with preset reason chips and a free-text field.
- **Advance with a note**: when moving a stage forward you can leave a reminder
  for that step (shown as a "PD" on the card).
- **Skip a stage**: mark the current step as "No aplica" and jump to the next one.
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
- **Own workflow**: Pendiente → Contactado → Referido hecho → En proceso →
  Contratado (or No aplica).
- **Referral → application flow**: when a referral reaches "En proceso", a modal
  offers to either create a new application (pre-filled) or link it to an
  existing one. The link is stored internally as `linkedJobId`.
- **Auto-sync**: when the linked application is closed as "Oferta", the referral
  moves to "Contratado" (and vice versa).
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

Each dashboard is wrapped in a header ("Postulaciones" / "Referidos") so the
two are visually distinguishable.

### Configuration modal

Eight tabs, all changes staged as a draft and applied on Save:

- **Puestos** — enable/disable role categories, add custom roles, hide/restore.
- **Estados iniciales** — pick which statuses appear in the dropdown and which
  one is default.
- **Filtros** — reorder and show/hide the filter chips.
- **Apariencia** — logo (2 options) and background (10 options: aurora, mesh,
  grid, dots, waves, conic, noise, stripes, cosmos, blobs, none).
- **Dashboard** — pick a style for jobs and another for referrals.
- **Idioma** — ES / EN.
- **Perfil** — name, username, email, bio, avatar (stored as dataURL).
- **Avanzado** — export/import JSON backup, plus three danger-zone actions:
  reset preferences, delete data, reset everything.

An unsaved-changes badge appears whenever the draft differs from the saved
state, and closing prompts to discard or save.

### Appearance & UX

- Light / dark theme with a radial ripple animation on toggle.
- Ten animated/static background styles.
- Toast notifications, custom confirm modals, and a progress-ring reset
  animation.
- All UI is fully internationalized (Spanish / English).
- Empty states are SVG-based, not emoji: clipboard for jobs, link for
  referrals, funnel for "no results in this filter".
- Card action buttons (edit / delete) use SVG icons with a soft-square style.

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
| `isLoggedIn()` | `true` if a valid session exists |
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
(`js/store.js`), which handles versioning and migrations.

| Key | Store | Version | Contents |
| --- | --- | --- | --- |
| `jobTrackerV2` | `jobs` | 3 | Array of applications |
| `jobTrackerReferidos` | `refs` | 3 | Array of referrals |
| `jobTrackerConfig` | `config` | 2 | User preferences |
| `jobTrackerTheme` | — | — | `'light'` \| `'dark'` |

### Application shape (abridged)

```js
{
  id, empresa, puesto, fecha, estado,
  link, salario, salarioPorHora, salarioEsRango, moneda,
  modalidad, hybridOfficeDays,
  contacto, contactoLink, contactoTipo,
  notas,
  skipped: [],              // step ids marked "not applicable"
  volvioAtras: false,       // only one backtrack allowed
  history: [{ estado, fecha, motivo?, nota?, retroceso? }],
  offerConfirmed?: boolean
}
```

### Referral shape (abridged)

```js
{
  id, nombre, rol, contacto, link, relacion, estado, notas,
  empresasVinculadas: [],   // legacy field, no longer shown in UI
  linkedJobId: null,        // set by the "Referral → Application" flow
  volvioAtras: false,
  createdAt,
  history: [{ estado, fecha, motivo?, nota?, retroceso? }]
}
```

### Migration

`main.js` registers a `migrate` function on each store that:

- Backfills missing fields on legacy records.
- Maps legacy referral state `'Me va a referir'` → `'Contactado'`.
- Splits the old single `dashboardStyle` into `dashboardStyleJobs` +
  `dashboardStyleRefs`.

---

## Backup / Restore

From **Configuración → Avanzado**:

- **Export**: downloads a JSON file with jobs, referrals, config, and theme.
- **Import**: replaces all current data from a backup file. Validates the
  `app` field (`jobTracker`) before applying.

Danger zone (all irreversible):

- **Reset preferences**: roles, states, filters, appearance → defaults. Data
  untouched.
- **Delete data**: wipes applications + referrals. Config untouched.
- **Reset everything**: config + data + theme → defaults.

---

## Run

The app uses ES modules, so you need an HTTP server rather than opening
`index.html` directly (file:// will fail on CORS).

```bash
npx serve .
```

Then open the printed URL (usually `http://localhost:3000`).

Default credentials for the mock sign-in are in `js/auth/session.js`. Change
the hash before shipping anything to a real user.

---

## Project structure

```
.
├── index.html                    # Main app shell
├── login.html                    # Sign-in screen
├── favicon.svg
├── README.md
├── js/
│   ├── main.js                   # Boot: stores, controllers, theme, session
│   ├── constants.js              # Workflow steps, states, defaults, options
│   ├── store.js                  # Reactive localStorage store w/ migrations
│   ├── selectors.js              # Pure state selectors (filters, stats)
│   ├── utils.js                  # Shared helpers (escapeHtml, dates…)
│   ├── i18n.js                   # ES / EN translations + applyI18n
│   ├── auth/
│   │   ├── login.js              # Login screen entry point
│   │   └── session.js            # Mock auth, session signing, guards
│   ├── controllers/
│   │   ├── jobsController.js
│   │   ├── refsController.js
│   │   ├── modalsController.js
│   │   ├── configController.js
│   │   └── createPuestoController.js
│   ├── templates/
│   │   ├── jobCard.js
│   │   ├── refCard.js
│   │   └── steps.js
│   └── ui/
│       ├── combo.js              # Role picker
│       ├── estadoCombo.js        # Status picker
│       ├── datePicker.js
│       ├── modalidad.js
│       ├── currencyPicker.js
│       ├── salaryModeChip.js
│       ├── salaryInput.js
│       ├── contactLinkPicker.js
│       ├── chips.js
│       ├── empresasChips.js      # (unused after referral changes)
│       ├── dashboard.js
│       ├── inputLimits.js
│       ├── confirmModal.js
│       ├── toast.js
│       └── resetAnimation.js
└── css/
    ├── styles.css                # @imports only
    ├── base.css
    ├── backgrounds.css
    ├── dashboard.css
    ├── forms.css
    ├── buttons.css
    ├── toolbar.css
    ├── jobs.css
    ├── workflow.css
    ├── datepicker.css
    ├── referrals.css
    ├── modals.css
    ├── history.css
    ├── config.css
    ├── feedback.css
    ├── responsive.css
    └── auth.css
```

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