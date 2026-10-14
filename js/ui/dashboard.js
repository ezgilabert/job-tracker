// ============================================================
// Dashboard: re-export shim.
//
// Real implementation lives in ./dashboard/ (index.js + one
// file per style + shared.js). This file exists so existing
// imports from '../ui/dashboard.js' keep working unchanged.
// ============================================================

export {
  renderDashboard,
  buildWeeklyTrend,
  buildDailyActivity,
} from './dashboard/index.js';