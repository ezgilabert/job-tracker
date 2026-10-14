// ============================================================
// Tests: selectors (pure state derivations)
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isClosed, stepIndex, progressPct, computeStats,
  filterJobs, sortJobs, currentStepNote, lastHistoryEntry,
  isRefClosed, refStepIndex, filterRefs, refsForCompany,
  topByCount, buildWeeklyTrend, buildDailyActivity,
} from '../js/app/selectors.js';

// ------------------------------------------------------------
// isClosed / stepIndex / progressPct
// ------------------------------------------------------------
test('isClosed: identifies only closed statuses', () => {
  assert.equal(isClosed('Rejected'), true);
  assert.equal(isClosed('Ghosted'), true);
  assert.equal(isClosed('Discarded'), true);
  assert.equal(isClosed('Applied'), false);
  assert.equal(isClosed('Offer'), false);
  assert.equal(isClosed(''), false);
});

test('stepIndex: returns position in the workflow', () => {
  assert.equal(stepIndex('Saved'), 0);
  assert.equal(stepIndex('Applied'), 1);
  assert.equal(stepIndex('Offer'), 12);
  assert.equal(stepIndex('Rejected'), -1);
});

test('progressPct: 100 for closed, percent otherwise', () => {
  assert.equal(progressPct('Rejected'), 100);
  assert.equal(progressPct('Saved'), Math.round((1 / 13) * 100));
  assert.equal(progressPct('Offer'), 100);
  assert.equal(progressPct('Unknown'), 0);
});

// ------------------------------------------------------------
// computeStats
// ------------------------------------------------------------
test('computeStats: empty jobs → all zero', () => {
  const stats = computeStats([]);
  assert.equal(stats.total, 0);
  assert.equal(stats.active, 0);
  assert.equal(stats.inProcess, 0);
  assert.equal(stats.offers, 0);
  assert.equal(stats.closed, 0);
});

test('computeStats: mixed statuses count correctly', () => {
  const jobs = [
    { status: 'Saved' },
    { status: 'Applied' },
    { status: 'HR Interview' },
    { status: 'Offer' },
    { status: 'Rejected' },
    { status: 'Rejected' },
    { status: 'Ghosted' },
  ];
  const stats = computeStats(jobs);
  assert.equal(stats.total, 7);
  assert.equal(stats.offers, 1);
  assert.equal(stats.inProcess, 1);
  // active = Saved + Applied + in-process + Offer
  assert.equal(stats.active, 4);
  // closed = Rejected + Ghosted + Discarded
  assert.equal(stats.closed, 3);
});

// ------------------------------------------------------------
// filterJobs
// ------------------------------------------------------------
test('filterJobs: by status', () => {
  const jobs = [
    { status: 'Saved', company: 'A' },
    { status: 'Applied', company: 'B' },
    { status: 'Rejected', company: 'C' },
  ];
  assert.equal(filterJobs(jobs, 'all').length, 3);
  assert.equal(filterJobs(jobs, 'active').length, 2);
  assert.equal(filterJobs(jobs, 'closed').length, 1);
  assert.equal(filterJobs(jobs, 'Applied').length, 1);
});

test('filterJobs: search matches company, role, notes', () => {
  const jobs = [
    { status: 'Applied', company: 'Google',  role: 'Frontend', notes: 'referred' },
    { status: 'Applied', company: 'Acme',    role: 'Backend',  notes: 'cold' },
  ];
  assert.equal(filterJobs(jobs, 'all', 'google').length, 1);
  assert.equal(filterJobs(jobs, 'all', 'BACKEND').length, 1);
  assert.equal(filterJobs(jobs, 'all', 'referred').length, 1);
  assert.equal(filterJobs(jobs, 'all', 'nope').length, 0);
});

// ------------------------------------------------------------
// sortJobs
// ------------------------------------------------------------
test('sortJobs: most advanced first', () => {
  const jobs = [
    { id: 1, status: 'Applied', date: '2025-01-01' },
    { id: 2, status: 'Offer',   date: '2025-01-01' },
    { id: 3, status: 'Saved',   date: '2025-01-01' },
  ];
  const sorted = sortJobs(jobs);
  assert.equal(sorted[0].status, 'Offer');
  assert.equal(sorted[1].status, 'Applied');
  assert.equal(sorted[2].status, 'Saved');
});

test('sortJobs: closed states sort last', () => {
  const jobs = [
    { id: 1, status: 'Rejected' },
    { id: 2, status: 'Applied' },
    { id: 3, status: 'Ghosted' },
    { id: 4, status: 'Discarded' },
  ];
  const sorted = sortJobs(jobs);
  assert.equal(sorted[0].status, 'Applied');
  assert.equal(sorted[sorted.length - 1].status, 'Discarded');
});

// ------------------------------------------------------------
// currentStepNote / lastHistoryEntry
// ------------------------------------------------------------
test('currentStepNote: picks latest note matching the current status', () => {
  const job = {
    status: 'Applied',
    history: [
      { status: 'Saved', note: 'old' },
      { status: 'Applied', note: 'follow up' },
      { status: 'Applied', note: 'still pending' },
    ],
  };
  assert.equal(currentStepNote(job), 'still pending');
});

test('currentStepNote: null when no note matches', () => {
  const job = {
    status: 'Applied',
    history: [{ status: 'Saved', note: 'old' }],
  };
  assert.equal(currentStepNote(job), null);
});

test('lastHistoryEntry: returns last entry or null', () => {
  assert.equal(lastHistoryEntry({ history: [] }), null);
  const last = lastHistoryEntry({ history: [{ a: 1 }, { b: 2 }] });
  assert.deepEqual(last, { b: 2 });
});

// ------------------------------------------------------------
// Referrals
// ------------------------------------------------------------
test('isRefClosed: only Not Applicable is closed', () => {
  assert.equal(isRefClosed('Not Applicable'), true);
  assert.equal(isRefClosed('Pending'), false);
  assert.equal(isRefClosed('Hired'), false);
});

test('refStepIndex: returns position in referral workflow', () => {
  assert.equal(refStepIndex('Pending'), 0);
  assert.equal(refStepIndex('Hired'), 4);
  assert.equal(refStepIndex('Not Applicable'), -1);
});

test('filterRefs: by status and search', () => {
  const refs = [
    { status: 'Pending', name: 'Alice', notes: 'manager' },
    { status: 'Hired',   name: 'Bob',   notes: '' },
  ];
  assert.equal(filterRefs(refs, 'all').length, 2);
  assert.equal(filterRefs(refs, 'Hired').length, 1);
  assert.equal(filterRefs(refs, 'all', 'alice').length, 1);
  assert.equal(filterRefs(refs, 'all', 'manager').length, 1);
});

test('refsForCompany: filters by linkedCompanies', () => {
  const refs = [
    { linkedCompanies: ['Acme', 'Globex'] },
    { linkedCompanies: ['Initech'] },
    { linkedCompanies: null },
  ];
  assert.equal(refsForCompany(refs, 'Acme').length, 1);
  assert.equal(refsForCompany(refs, 'Nope').length, 0);
});

// ------------------------------------------------------------
// topByCount
// ------------------------------------------------------------
test('topByCount: single-key accessor', () => {
  const items = [{ c: 'A' }, { c: 'A' }, { c: 'B' }, { c: null }];
  const top = topByCount(items, i => i.c);
  assert.deepEqual(top, [
    { name: 'A', count: 2 },
    { name: 'B', count: 1 },
  ]);
});

test('topByCount: array accessor counts each value once', () => {
  const items = [
    { rel: ['A', 'B'] },
    { rel: ['B', 'C'] },
    { rel: 'A' },
  ];
  const top = topByCount(items, i => i.rel);
  // Ties (A and B both at 2) preserve insertion order: A seen first.
  assert.deepEqual(top, [
    { name: 'A', count: 2 },
    { name: 'B', count: 2 },
    { name: 'C', count: 1 },
  ]);
});

test('topByCount: empty input → []', () => {
  assert.deepEqual(topByCount([], i => i.x), []);
});

// ------------------------------------------------------------
// buildWeeklyTrend
// ------------------------------------------------------------
test('buildWeeklyTrend: returns N points', () => {
  const trend = buildWeeklyTrend([], () => '', 4);
  assert.equal(trend.length, 4);
  assert.deepEqual(trend, [0, 0, 0, 0]);
});

test('buildWeeklyTrend: counts items older than cutoff', () => {
  const now = new Date();
  const old = new Date(now.getTime() - 30 * 86400000).toISOString();
  const recent = new Date(now.getTime() - 1 * 86400000).toISOString();
  const items = [{ date: old }, { date: recent }];
  const trend = buildWeeklyTrend(items, i => i.date, 4);
  // All points after week 1 should include both items.
  assert.equal(trend[trend.length - 1], 2);
  assert.equal(trend[0], 1); // only the old item existed 3 weeks ago
});

// ------------------------------------------------------------
// buildDailyActivity
// ------------------------------------------------------------
test('buildDailyActivity: returns N buckets', () => {
  const buckets = buildDailyActivity([], () => '', 10);
  assert.equal(buckets.length, 10);
  assert.deepEqual(buckets, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test('buildDailyActivity: today lands in the last bucket', () => {
  const items = [{ date: new Date().toISOString() }];
  const buckets = buildDailyActivity(items, i => i.date, 5);
  assert.equal(buckets[4], 1);
});