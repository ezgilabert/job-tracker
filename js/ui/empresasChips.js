// ============================================================
// CompanyChips: reusable company chips for referrals
// ============================================================

import { escapeHtml } from '../utils.js';
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container
 * @param {Set<string>} selectedSet
 * @param {string[]} availableCompanies
 * @returns {void}
 */
export function renderCompanyChips(container, selectedSet, availableCompanies) {
  if (availableCompanies.length === 0) {
    container.innerHTML = `<span class="ref-empresa-empty">${escapeHtml(t('refEmpresa.empty'))}</span>`;
    return;
  }

  container.innerHTML = availableCompanies.map(emp => {
    const isSelected = selectedSet.has(emp);
    return `<button type="button" class="ref-empresa-chip ${isSelected ? 'selected' : ''}" data-empresa="${escapeHtml(emp)}">${escapeHtml(emp)}</button>`;
  }).join('');
}

/**
 * @param {HTMLElement} container
 * @param {Set<string>} selectedSet
 * @returns {void}
 */
export function mountCompanyChips(container, selectedSet) {
  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.ref-empresa-chip');
    if (!chip) return;
    const emp = chip.dataset.empresa;
    if (selectedSet.has(emp)) {
      selectedSet.delete(emp);
      chip.classList.remove('selected');
    } else {
      selectedSet.add(emp);
      chip.classList.add('selected');
    }
  });
}