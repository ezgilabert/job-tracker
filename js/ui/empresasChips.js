// ============================================================
// EmpresasChips: reusable company chips for referrals
// ============================================================

import { escapeHtml } from '../utils.js';

/**
 * @param {HTMLElement} container
 * @param {Set<string>} selectedSet
 * @param {string[]} availableEmpresas
 * @returns {void}
 */
export function renderEmpresasChips(container, selectedSet, availableEmpresas) {
  if (availableEmpresas.length === 0) {
    container.innerHTML = `<span class="ref-empresa-empty">Agregá postulaciones primero para poder vincularlas</span>`;
    return;
  }

  container.innerHTML = availableEmpresas.map(emp => {
    const sel = selectedSet.has(emp);
    return `<button type="button" class="ref-empresa-chip ${sel ? 'selected' : ''}" data-empresa="${escapeHtml(emp)}">${escapeHtml(emp)}</button>`;
  }).join('');
}

/**
 * @param {HTMLElement} container
 * @param {Set<string>} selectedSet
 * @returns {void}
 */
export function mountEmpresasChips(container, selectedSet) {
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
