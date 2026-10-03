# Job Tracker

Local app for tracking a job search: applications, process stages, and referrals.

No backend or build step. Data lives in the browser’s `localStorage`.

## Features

- Create, edit, and delete applications (company, role, date, link, salary, contact, notes).
- Stage workflow: Guardado → Aplicado → interviews / challenges → Oferta.
- Close with a reason: Rechazado, Ghosted, Descartado, or Oferta.
- Notes when advancing a stage, plus steps marked as not applicable.
- Reorder cards with drag and drop.
- Filters by status and stats (total, active, in process, offers, closed).
- Referrals with their own workflow, company links, and a shortcut to create or attach an application.
- Light / dark theme.

The first visit loads sample applications. Edits persist in the browser.

## Run

Scripts are ES modules, so you need an HTTP server rather than opening the file directly.

```bash
npx serve .
```

Or:

```bash
python -m http.server 8080
```

Then open the URL printed by the command (for example `http://localhost:3000`).

## Data

| Key | Contents |
| --- | --- |
| `jobTrackerV2` | Applications |
| `jobTrackerReferidos` | Referrals |
| `jobTrackerTheme` | Theme |

To reset, delete those keys in the browser DevTools.

## Structure

```
index.html
css/styles.css
js/
  main.js              # wiring
  store.js             # persistence + migration
  constants.js         # stages, close reasons, defaults
  selectors.js         # stats, filters, sort
  utils.js             # shared helpers (escapeHtml, ensureArray, cloneArray, etc.)
  controllers/         # jobs, referrals, modals
  templates/           # card and stats HTML
  ui/                  # date picker, combo, chips, toast, confirm modal, empresas chips
```
