// ============================================================
// Config panel: Advanced
//
//   - Backup stats (jobs + refs counters).
//   - Export / import JSON backup.
//
// Note: the three danger-zone buttons (reset preferences,
// delete data, reset all) are owned by the facade, because they
// touch the draft wholesale and the reset overlay. This panel
// only renders the stats card.
// ============================================================

import { showToast } from '../../ui/feedback/toast.js';
import { showConfirm } from '../../ui/feedback/confirmModal.js';
import {
  BACKUP_APP_ID, BACKUP_VERSION, STORAGE_KEYS,
} from '../../app/constants.js';
import { migrateJob, migrateRef, migrateConfig } from '../../app/migrations.js';
import { escapeHtml } from '../../app/utils.js';
import { icon } from '../../app/icons.js';
import { t } from '../../i18n/index.js';

export function mountAdvancedPanel(host) {
  const statsEl = document.getElementById('configBackupStats');
  const exportBtn = document.getElementById('exportDataBtn');
  const importBtn = document.getElementById('importDataBtn');
  const importInput = document.getElementById('importDataInput');

  // ----------------------------------------------------------
  // Backup stats
  // ----------------------------------------------------------
  function refreshStats() {
    if (!statsEl) return;

    const jobs = host.jobsStore.get() || [];
    const refs = host.refsStore.get() || [];
    const jobsCount = Array.isArray(jobs) ? jobs.length : 0;
    const refsCount = Array.isArray(refs) ? refs.length : 0;

    statsEl.innerHTML = `
      <span class="config-backup-stat">${icon('icon-clipboard')} ${jobsCount} ${escapeHtml(t('config.backup.jobs'))}</span>
      <span class="config-backup-stat">${icon('icon-users')} ${refsCount} ${escapeHtml(t('config.backup.refs'))}</span>
    `;
  }

  // ----------------------------------------------------------
  // Export
  // ----------------------------------------------------------
  function buildPayload() {
    const theme = (() => {
      try { return localStorage.getItem(STORAGE_KEYS.THEME) || 'light'; }
      catch { return 'light'; }
    })();

    return {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        jobs: host.jobsStore.get() || [],
        refs: host.refsStore.get() || [],
        config: host.configStore.get(),
        theme,
      },
    };
  }

  function exportBackup() {
    const payload = buildPayload();
    const json = JSON.stringify(payload, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `job-tracker-backup-${date}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(t('toast.backupExported'), 'icon-arrow-down');
  }

  // ----------------------------------------------------------
  // Import
  // ----------------------------------------------------------
  function validateBackup(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.app !== BACKUP_APP_ID) return false;
    if (!parsed.data || typeof parsed.data !== 'object') return false;
    return true;
  }

  async function importFromFile(file) {
    let text;
    try {
      text = await file.text();
    } catch {
      showToast(t('toast.backupInvalid'), 'icon-alert-triangle');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      showToast(t('toast.backupInvalid'), 'icon-alert-triangle');
      return;
    }

    if (!validateBackup(parsed)) {
      showToast(t('toast.backupInvalid'), 'icon-alert-triangle');
      return;
    }

    const data = parsed.data || {};

    const nextConfig = migrateConfig(data.config || {});
    const nextRefs   = Array.isArray(data.refs) ? data.refs.map(migrateRef) : [];
    const nextJobs   = Array.isArray(data.jobs) ? data.jobs.map(migrateJob) : [];

    const jobsCount = nextJobs.length;
    const refsCount = nextRefs.length;

    const ok = await showConfirm({
      title: t('confirm.importBackup.title'),
      message: t('confirm.importBackup.message', { jobs: jobsCount, refs: refsCount }),
      confirmText: t('confirm.importBackup.confirm'),
      danger: true,
    });
    if (!ok) return;

    host.configStore.update(() => nextConfig);
    host.refsStore.update(() => nextRefs);
    host.jobsStore.update(() => nextJobs);

    if (data.theme === 'light' || data.theme === 'dark') {
      try { localStorage.setItem(STORAGE_KEYS.THEME, data.theme); } catch {}
      document.documentElement.setAttribute('data-theme', data.theme);
    }

    // Close the config modal — the imported config replaces the
    // current one, so any open draft is now stale.
    document.getElementById('configModal')?.classList.remove('open');

    showToast(
      t('toast.backupImported', { jobs: jobsCount, refs: refsCount }),
      'icon-arrow-up'
    );
  }

  if (exportBtn) exportBtn.addEventListener('click', exportBackup);

  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files?.[0];
      if (!file) return;
      importFromFile(file);
      importInput.value = '';
    });
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  function render() {
    refreshStats();
  }

  return { render, refreshStats };
}