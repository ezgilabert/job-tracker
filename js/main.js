// ============================================================
// Punto de entrada: wiring de stores, controllers y UI
// ============================================================

import { Store } from './store.js';
import { STORAGE_KEYS, STORAGE_VERSION, SAMPLE_JOBS } from './constants.js';
import { mountJobsController } from './controllers/jobsController.js';
import { mountRefsController } from './controllers/refsController.js';
import { mountModalsController } from './controllers/modalsController.js';
import { DatePicker } from './ui/datePicker.js';
import { PuestoCombo } from './ui/combo.js';
import { mountChips } from './ui/chips.js';

// ------------------------------------------------------------
// Tema (claro/oscuro)
// ------------------------------------------------------------
function mountTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
  });
}

// ------------------------------------------------------------
// Stores
// ------------------------------------------------------------
const jobsStore = new Store(STORAGE_KEYS.JOBS, [], {
  version: STORAGE_VERSION,
  seed: () => SAMPLE_JOBS.map(j => ({ ...j })),
  migrate: (data, from, to) => {
    // v0 (array plano) → v2
    if (Array.isArray(data)) {
      return data.map(j => ({
        ...j,
        contacto: j.contacto ?? '',
        skipped: Array.isArray(j.skipped) ? j.skipped : [],
        history: Array.isArray(j.history) && j.history.length
          ? j.history
          : [{ estado: j.estado, fecha: new Date().toISOString() }],
      }));
    }
    return data;
  },
});

const refsStore = new Store(STORAGE_KEYS.REFS, [], {
  version: STORAGE_VERSION,
  migrate: (data) => {
    if (Array.isArray(data)) {
      return data.map(r => ({
        ...r,
        estado: r.estado || 'Pendiente',
        empresasVinculadas: Array.isArray(r.empresasVinculadas) ? r.empresasVinculadas : [],
      }));
    }
    return data;
  },
});

// ------------------------------------------------------------
// UI: fecha, puesto, chips de referido
// ------------------------------------------------------------
const fechaPicker = new DatePicker(document.getElementById('fechaPicker'), {
  onChange: () => {},
});

const puestoCombo = new PuestoCombo(document.getElementById('puestoCombo'), {
  getJobPuestos: () => jobsStore.get().map(j => j.puesto),
});

const refRelacionChips = mountChips(document.getElementById('refRelacionChips'));
const refEstadoChips = mountChips(document.getElementById('refEstadoChips'));

// Exponer el datepicker al form (jobsController lo usa para resetear)
// Es un caso de borde: el input vive en el form pero el componente no.
// Lo dejamos en un Symbol para no contaminar window.
window.__fechaPicker = fechaPicker;

// ------------------------------------------------------------
// Controllers
// ------------------------------------------------------------
const modals = mountModalsController(jobsStore, refsStore);
const jobsCtrl = mountJobsController(jobsStore, refsStore, modals);
const refsCtrl = mountRefsController(jobsStore, refsStore, modals);

// Pasar los chips ya montados al refsController
refsCtrl.initChips(refRelacionChips, refEstadoChips);

// ------------------------------------------------------------
// Tema
// ------------------------------------------------------------
mountTheme();