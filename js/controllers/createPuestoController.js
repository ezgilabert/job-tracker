// ============================================================
// Controller: crear puesto desde el combo
// Modal con nombre + categorías (multi-select).
// Guarda el puesto en config.puestos.custom y sus tags en
// config.puestos.customTags.
// ============================================================

import { showToast } from '../ui/toast.js';
import { DEFAULT_ROLES, ROLE_TAGS_LIST } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { t } from '../i18n.js';

/**
 * @param {import('../store.js').Store} configStore
 */
export function mountCreatePuestoController(configStore) {
  const modal = document.getElementById('createPuestoModal');
  const input = document.getElementById('createPuestoName');
  const saveBtn = document.getElementById('saveCreatePuesto');
  const cancelBtn = document.getElementById('cancelCreatePuesto');
  const catsWrap = document.getElementById('createPuestoCats');

  if (!modal || !input) {
    return {
      open: () => Promise.resolve(null),
      requestNewPuesto: () => Promise.resolve(null),
    };
  }

  let pendingResolve = null;
  let selectedCats = new Set();

  // ----------------------------------------------------------
  // Render de chips de categoría
  // ----------------------------------------------------------
  function renderCats() {
    if (!catsWrap) return;
    catsWrap.innerHTML = ROLE_TAGS_LIST.map(cat => {
      const isSelected = selectedCats.has(cat.id);
      return `
        <button type="button"
                class="create-cat-chip ${isSelected ? 'selected' : ''}"
                data-cat="${escapeHtml(cat.id)}">
          <span>${cat.icon}</span>
          <span>${escapeHtml(cat.label)}</span>
        </button>
      `;
    }).join('');
  }

  if (catsWrap) {
    catsWrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.create-cat-chip');
      if (!chip) return;
      const id = chip.dataset.cat;
      if (selectedCats.has(id)) selectedCats.delete(id);
      else selectedCats.add(id);
      renderCats();
    });
  }

  // ----------------------------------------------------------
  // Open / close
  // ----------------------------------------------------------
  function isOpen() {
    return modal.classList.contains('open');
  }

  function open({ suggested = '', preSelectedCats = [] } = {}) {
    return new Promise((resolve) => {
      pendingResolve = resolve;
      input.value = suggested;
      saveBtn.disabled = !suggested.trim();
      selectedCats = new Set(preSelectedCats);
      renderCats();
      modal.classList.add('open');
      setTimeout(() => {
        input.focus();
        input.select();
      }, 80);
    });
  }

  function close(result = null) {
    modal.classList.remove('open');
    if (pendingResolve) {
      pendingResolve(result);
      pendingResolve = null;
    }
  }

  function commit() {
    const name = input.value.trim();
    if (!name) return;
    close({ name, cats: [...selectedCats] });
  }

  input.addEventListener('input', () => {
    saveBtn.disabled = !input.value.trim();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close(null);
    }
  });

  saveBtn.addEventListener('click', commit);
  cancelBtn.addEventListener('click', () => close(null));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close(null);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (isOpen()) {
      e.stopPropagation();
      close(null);
    }
  }, true);

  // ----------------------------------------------------------
  // requestNewPuesto
  // ----------------------------------------------------------
  async function requestNewPuesto(suggested = '') {
    const cfg = configStore.get();
    const custom = cfg.puestos?.custom || [];
    const customTags = cfg.puestos?.customTags || {};
    const preSelectedCats = customTags[suggested] || [];

    const result = await open({ suggested, preSelectedCats });
    if (!result) return null;

    const { name, cats } = result;

    const hidden = cfg.puestos?.hidden || [];
    const isDefault = DEFAULT_ROLES.includes(name);
    const isCustom = custom.includes(name);

    configStore.update(c => {
      const nextPuestos = { ...(c.puestos || {}) };
      const nextCustom = [...(nextPuestos.custom || [])];
      const nextCustomTags = { ...(nextPuestos.customTags || {}) };
      const nextHidden = [...(nextPuestos.hidden || [])];

      // Si el puesto ya existe como default, no lo duplicamos en custom.
      // Sólo guardamos sus categorías en customTags (para que se filtren bien).
      if (!isDefault && !isCustom) {
        nextCustom.push(name);
      }

      // Guardamos (o actualizamos) sus tags.
      if (cats.length > 0) {
        nextCustomTags[name] = cats;
      } else {
        delete nextCustomTags[name];
      }

      // Desocultamos si estaba oculto.
      const hiddenIdx = nextHidden.indexOf(name);
      if (hiddenIdx >= 0) nextHidden.splice(hiddenIdx, 1);

      nextPuestos.custom = nextCustom;
      nextPuestos.customTags = nextCustomTags;
      nextPuestos.hidden = nextHidden;

      return { ...c, puestos: nextPuestos };
    });

    if (!isDefault && !isCustom) {
      showToast(t('toast.puestoCreated', { name }), '✨');
    }

    return name;
  }

  return { open, requestNewPuesto };
}