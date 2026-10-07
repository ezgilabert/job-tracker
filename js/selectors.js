// ============================================================
// Pure state selectors: stats, filters, sort
// ============================================================

import {
  WORKFLOW_STEPS,
  CLOSED_STATES,
  ALL_STATES,
  REF_WORKFLOW_STEPS,
  REF_CLOSED_STATES,
} from './constants.js';
import { ensureArray } from './utils.js';

// ------------------------------------------------------------
// Jobs
// ------------------------------------------------------------
export function isClosed(estado) {
  return CLOSED_STATES.includes(estado);
}

export function stepIndex(estado) {
  return WORKFLOW_STEPS.findIndex(s => s.id === estado);
}

export function progressPct(estado) {
  if (isClosed(estado)) return 100;
  const idx = stepIndex(estado);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / WORKFLOW_STEPS.length) * 100);
}

export function computeStats(jobs) {
  const byState = {};
  ALL_STATES.forEach(s => { byState[s] = 0; });
  jobs.forEach(j => {
    if (byState[j.estado] !== undefined) byState[j.estado]++;
  });

  const inProcess =
    byState['Contacto'] +
    byState['Entrevista RRHH'] +
    byState['Challenge técnico'] +
    byState['Live coding'] +
    byState['Entrevista Técnica'] +
    byState['Entrevista con cliente'] +
    byState['Charla con cliente'] +
    byState['Entrevista Final'] +
    byState['Referencias'] +
    byState['Negociación'];

  const active =
    byState['Guardado'] + byState['Aplicado'] + inProcess + byState['Oferta'];
  const closed =
    byState['Rechazado'] + byState['Ghosted'] + byState['Descartado'];

  return {
    total: jobs.length,
    activos: active,
    enProceso: inProcess,
    ofertas: byState['Oferta'],
    cerradas: closed,
    porEstado: byState,
  };
}

/**
 * Filter jobs by status AND free-text search.
 * Search matches company, role, contact, notes and salary.
 */
export function filterJobs(jobs, filter, searchTerm = '') {
  let out = jobs;

  if (filter === 'all') {
    // no status filter
  } else if (filter === 'active') {
    out = out.filter(j => !isClosed(j.estado));
  } else if (filter === 'closed') {
    out = out.filter(j => isClosed(j.estado));
  } else {
    out = out.filter(j => j.estado === filter);
  }

  const q = searchTerm.trim().toLowerCase();
  if (q) {
    out = out.filter(j =>
      (j.empresa  || '').toLowerCase().includes(q) ||
      (j.puesto   || '').toLowerCase().includes(q) ||
      (j.contacto || '').toLowerCase().includes(q) ||
      (j.notas    || '').toLowerCase().includes(q) ||
      (j.salario  || '').toLowerCase().includes(q)
    );
  }

  return out;
}

function advanceRank(estado) {
  if (estado === 'Oferta') return 1000;
  const idx = stepIndex(estado);
  if (idx >= 0) return idx;
  if (estado === 'Rechazado') return -1;
  if (estado === 'Ghosted') return -2;
  if (estado === 'Descartado') return -3;
  return -10;
}

/** Most advanced first; ties broken by newer date/id. */
export function sortJobs(jobs) {
  return [...jobs].sort((a, b) => {
    const ra = advanceRank(a.estado);
    const rb = advanceRank(b.estado);
    if (rb !== ra) return rb - ra;
    const da = a.fecha || '';
    const db = b.fecha || '';
    if (db !== da) return db.localeCompare(da);
    return (b.id || 0) - (a.id || 0);
  });
}

export function currentStepNote(job) {
  const hist = ensureArray(job.history);
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].estado === job.estado && hist[i].nota) return hist[i].nota;
  }
  return null;
}

export function lastHistoryEntry(job) {
  const hist = ensureArray(job.history);
  return hist.length ? hist[hist.length - 1] : null;
}

// ------------------------------------------------------------
// Referrals
// ------------------------------------------------------------
export function isRefClosed(estado) {
  return REF_CLOSED_STATES.includes(estado);
}

export function refStepIndex(estado) {
  return REF_WORKFLOW_STEPS.findIndex(s => s.id === estado);
}

export function filterRefs(refs, filter, searchTerm = '') {
  let out = refs;
  if (filter !== 'all') out = out.filter(r => r.estado === filter);
  const q = searchTerm.trim().toLowerCase();
  if (q) {
    out = out.filter(r =>
      (r.nombre || '').toLowerCase().includes(q) ||
      (r.rol || '').toLowerCase().includes(q) ||
      (r.contacto || '').toLowerCase().includes(q) ||
      (r.notas || '').toLowerCase().includes(q) ||
      (r.empresasVinculadas || []).some(e => e.toLowerCase().includes(q))
    );
  }
  return out;
}

export function refsForCompany(refs, empresa) {
  return refs.filter(r =>
    Array.isArray(r.empresasVinculadas) && r.empresasVinculadas.includes(empresa)
  );
}

export function uniqueCompanies(jobs) {
  return [...new Set(jobs.map(j => j.empresa).filter(Boolean))];
}