// ============================================================
// Pure state selectors: stats, filters, sort, dashboard data.
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

/**
 * Returns the referrals linked to a given job id.
 * Replaces the old refsForCompany(refs, company) which matched on
 * the legacy `linkedCompanies` field — nothing writes to that
 * anymore, so the section was always empty for current data.
 *
 * @param {object[]} refs
 * @param {number|string} jobId
 * @returns {object[]}
 */
export function refsForJob(refs, jobId) {
  if (jobId === undefined || jobId === null) return [];
  return refs.filter(r => r.linkedJobId === jobId);
}

// ============================================================
// Dashboard data: pure helpers shared by jobs + referrals.
// ============================================================

/**
 * Counts the occurrences of a key across a set of items and returns
 * them sorted by count descending.
 *
 * The key function may return:
 *   - a single string (counted once)
 *   - an array of strings (each unique value counted once)
 *   - null / undefined / '' (skipped)
 *
 * @param {object[]} items
 * @param {(item: object) => string|string[]|null|undefined} keyFn
 * @returns {{ name: string, count: number }[]}
 */
export function topByCount(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const raw = keyFn(item);
    const keys = Array.isArray(raw) ? raw : [raw];
    for (const key of keys) {
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Cumulative weekly trend: returns N points, each with the number
 * of items that existed by the end of that week.
 */
export function buildWeeklyTrend(items, getDate, weeks = 4) {
  const now = Date.now();
  const points = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const cutoff = now - i * 7 * 86400000;
    let count = 0;
    for (const it of items) {
      const d = getDate(it);
      if (!d) continue;
      const ts = new Date(d).getTime();
      if (!isNaN(ts) && ts <= cutoff) count++;
    }
    points.push(count);
  }
  return points;
}

/**
 * Per-day activity for the heatmap. Returns an array of N numbers
 * (one per day, oldest first).
 */
export function buildDailyActivity(items, getDate, days = 60) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = new Array(days).fill(0);
  for (const it of items) {
    const d = getDate(it);
    if (!d) continue;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) continue;
    dt.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now - dt) / 86400000);
    if (diffDays >= 0 && diffDays < days) {
      buckets[days - 1 - diffDays]++;
    }
  }
  return buckets;
}