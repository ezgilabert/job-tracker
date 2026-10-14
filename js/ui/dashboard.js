// ============================================================
// Dashboard: re-export shim.
//
// Real implementation lives in ./dashboard/. This file exists so
// existing imports from '../ui/dashboard.js' keep working.
//
// Only renderDashboard is exposed here. Trend/activity helpers
// live in js/selectors.js (they are derivations of state, not
// dashboard presentation).
// ============================================================

export { renderDashboard } from './dashboard/index.js';