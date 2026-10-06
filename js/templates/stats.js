// ============================================================
// Template: stats row
// ============================================================

import { t } from '../i18n.js';

/**
 * @param {{ total:number, activos:number, enProceso:number, ofertas:number, cerradas:number }} stats
 * @returns {string} HTML
 */
export function renderStats(stats) {
  return `
    <div class="stat" data-color="info">
      <div class="num">${stats.total}</div>
      <div class="label">${t('stats.total')}</div>
    </div>
    <div class="stat" data-color="info">
      <div class="num">${stats.activos}</div>
      <div class="label">${t('stats.active')}</div>
    </div>
    <div class="stat" data-color="warning">
      <div class="num">${stats.enProceso}</div>
      <div class="label">${t('stats.inProcess')}</div>
    </div>
    <div class="stat" data-color="success">
      <div class="num">${stats.ofertas}</div>
      <div class="label">${t('stats.offers')}</div>
    </div>
    <div class="stat" data-color="danger">
      <div class="num">${stats.cerradas}</div>
      <div class="label">${t('stats.closed')}</div>
    </div>
  `;
}