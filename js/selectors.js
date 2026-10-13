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
export function isClosed(status) {
  return CLOSED_STATES.includes(status);
}

export function stepIndex(status) {
  return WORKFLOW_STEPS.findIndex(s => s.id === status);
}

export function progressPct(status) {
  if (isClosed(status)) return 100;
  const idx = stepIndex(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / WORKFLOW_STEPS.length) * 100);
}

export function computeStats(jobs) {
  const byStatus = {};
  ALL_STATES.forEach(s => { byStatus[s] = 0; });
  jobs.forEach(j => {
    if (byStatus[j.status] !== undefined) byStatus[j.status]++;
  });

  const inProcess =
    byStatus['Contact'] +
    byStatus['HR Interview'] +
    byStatus['Technical Challenge'] +
    byStatus['Live Coding'] +
    byStatus['Technical Interview'] +
    byStatus['Client Interview'] +
    byStatus['Client Chat'] +
    byStatus['Final Interview'] +
    byStatus['References'] +
    byStatus['Negotiation'];

  const active =
    byStatus['Saved'] + byStatus['Applied'] + inProcess + byStatus['Offer'];
  const closed =
    byStatus['Rejected'] + byStatus['Ghosted'] + byStatus['Discarded'];

  return {
    total: jobs.length,
    active,
    inProcess,
    offers: byStatus['Offer'],
    closed,
    byStatus,
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
    out = out.filter(j => !isClosed(j.status));
  } else if (filter === 'closed') {
    out = out.filter(j => isClosed(j.status));
  } else {
    out = out.filter(j => j.status === filter);
  }

  const q = searchTerm.trim().toLowerCase();
  if (q) {
    out = out.filter(j =>
      (j.company || '').toLowerCase().includes(q) ||
      (j.role    || '').toLowerCase().includes(q) ||
      (j.contact || '').toLowerCase().includes(q) ||
      (j.notes   || '').toLowerCase().includes(q) ||
      (j.salary  || '').toLowerCase().includes(q)
    );
  }

  return out;
}

function advanceRank(status) {
  if (status === 'Offer') return 1000;
  const idx = stepIndex(status);
  if (idx >= 0) return idx;
  if (status === 'Rejected') return -1;
  if (status === 'Ghosted') return -2;
  if (status === 'Discarded') return -3;
  return -10;
}

/** Most advanced first; ties broken by newer date/id. */
export function sortJobs(jobs) {
  return [...jobs].sort((a, b) => {
    const ra = advanceRank(a.status);
    const rb = advanceRank(b.status);
    if (rb !== ra) return rb - ra;
    const da = a.date || '';
    const db = b.date || '';
    if (db !== da) return db.localeCompare(da);
    return (b.id || 0) - (a.id || 0);
  });
}

export function currentStepNote(job) {
  const hist = ensureArray(job.history);
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].status === job.status && hist[i].note) return hist[i].note;
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
export function isRefClosed(status) {
  return REF_CLOSED_STATES.includes(status);
}

export function refStepIndex(status) {
  return REF_WORKFLOW_STEPS.findIndex(s => s.id === status);
}

export function filterRefs(refs, filter, searchTerm = '') {
  let out = refs;
  if (filter !== 'all') out = out.filter(r => r.status === filter);
  const q = searchTerm.trim().toLowerCase();
  if (q) {
    out = out.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.role || '').toLowerCase().includes(q) ||
      (r.contact || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q) ||
      (r.linkedCompanies || []).some(e => e.toLowerCase().includes(q))
    );
  }
  return out;
}

export function refsForCompany(refs, company) {
  return refs.filter(r =>
    Array.isArray(r.linkedCompanies) && r.linkedCompanies.includes(company)
  );
}

export function uniqueCompanies(jobs) {
  return [...new Set(jobs.map(j => j.company).filter(Boolean))];
}