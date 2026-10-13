// ============================================================
// CompanyChips: reusable company chips for referrals
// ============================================================

import { escapeHtml } from '../utils.js';
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} container
 * @param {Set<string>} selectedSet
 * @param {string[]} availableCompanies
 */
export function renderCompanyChips(container, selectedSet, availableCompanies) {
  if (availableCompanies.length === 0) {
    container.innerHTML = `<span class="ref-company-empty">${escapeHtml(t('refCompany.empty'))}</span>`;
    return;
  }

  container.innerHTML = availableCompanies.map(emp => {
    const isSelected = selectedSet.has(emp);
    return `<button type="button" class="ref-company-chip ${isSelected ? 'selected' : ''}" data-company="${escapeHtml(emp)}">${escapeHtml(emp)}</button>`;
  }).join('');
}

/**
 * @param {HTMLElement} container
 * @param {Set<string>} selectedSet
 */
export function mountCompanyChips(container, selectedSet) {
  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.ref-company-chip');
    if (!chip) return;
    const emp = chip.dataset.company;
    if (selectedSet.has(emp)) {
      selectedSet.delete(emp);
      chip.classList.remove('selected');
    } else {
      selectedSet.add(emp);
      chip.classList.add('selected');
    }
  });
}