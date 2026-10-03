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
  const porEstado = {};
  ALL_STATES.forEach(s => { porEstado[s] = 0; });
  jobs.forEach(j => {
    if (porEstado[j.estado] !== undefined) porEstado[j.estado]++;
  });

  const enProceso =
    porEstado['Contacto'] +
    porEstado['Entrevista RRHH'] +
    porEstado['Challenge técnico'] +
    porEstado['Live coding'] +
    porEstado['Entrevista Técnica'] +
    porEstado['Entrevista con cliente'] +
    porEstado['Charla con cliente'] +
    porEstado['Entrevista Final'] +
    porEstado['Referencias'] +
    porEstado['Negociación'];

  const activos =
    porEstado['Guardado'] + porEstado['Aplicado'] + enProceso + porEstado['Oferta'];
  const cerradas =
    porEstado['Rechazado'] + porEstado['Ghosted'] + porEstado['Descartado'];

  return {
    total: jobs.length,
    activos,
    enProceso,
    ofertas: porEstado['Oferta'],
    cerradas,
    porEstado,
  };
}

export function filterJobs(jobs, filter) {
  if (filter === 'all') return jobs;
  if (filter === 'active') return jobs.filter(j => !isClosed(j.estado));
  if (filter === 'closed') return jobs.filter(j => isClosed(j.estado));
  return jobs.filter(j => j.estado === filter);
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
  const hist = Array.isArray(job.history) ? job.history : [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].estado === job.estado && hist[i].nota) return hist[i].nota;
  }
  return null;
}

export function lastHistoryEntry(job) {
  const hist = Array.isArray(job.history) ? job.history : [];
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

export function refsForEmpresa(refs, empresa) {
  return refs.filter(r =>
    Array.isArray(r.empresasVinculadas) && r.empresasVinculadas.includes(empresa)
  );
}

export function uniqueEmpresas(jobs) {
  return [...new Set(jobs.map(j => j.empresa).filter(Boolean))];
}