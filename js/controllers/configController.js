// ============================================================
// Controller: config
// Modal with tabs (roles, initial states, filters, appearance)
// Draft in memory. Warns if there are unsaved changes.
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import {
  PUESTO_TAGS_LIST, PUESTO_TAGS, DEFAULT_PUESTOS,
  WORKFLOW_STEPS, CONFIG_FILTER_META, getDefaultConfig,
  LOGO_OPTIONS, DEFAULT_LOGO,
} from '../constants.js';
import { escapeHtml, cloneArray } from '../utils.js';

/**
 * @param {import('../store.js').Store} configStore
 */
export function mountConfigController(configStore) {
  const modal = document.getElementById('configModal');
  const unsavedModal = document.getElementById('unsavedModal');
  const unsavedBadge = document.getElementById('configUnsavedBadge');

  const tabs = [...modal.querySelectorAll('.config-tab')];
  const panels = [...modal.querySelectorAll('.config-panel')];

  // ----------------------------------------------------------
  // Draft state
  // ----------------------------------------------------------
  let draft = null;

  function cloneConfig(cfg) {
    return JSON.parse(JSON.stringify(cfg));
  }

  /**
   * Deep comparison (immune to key order).
   */
  function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      if (keysA[i] !== keysB[i]) return false;
      if (!deepEqual(a[keysA[i]], b[keysA[i]])) return false;
    }
    return true;
  }

  function isDraftDirty() {
    if (!draft) return false;
    return !deepEqual(draft, configStore.get());
  }

  function updateBadge() {
    unsavedBadge.classList.toggle('visible', isDraftDirty());
  }

  // ----------------------------------------------------------
  // Open / close
  // ----------------------------------------------------------
  function open() {
    // Clone exactly as saved. We DON'T touch the draft here:
    // if we add default fields, the draft becomes "dirty" immediately.
    draft = cloneConfig(configStore.get());
    modal.classList.add('open');
    renderAll();
  }

  function closeDirect() {
    draft = null;
    modal.classList.remove('open');
    unsavedBadge.classList.remove('visible');
  }

  function saveDraft() {
    const next = cloneConfig(draft);
    // When saving, we do complete the logo so the next opening
    // doesn't consider it "dirty" again.
    if (!next.logo) next.logo = DEFAULT_LOGO;
    configStore.update(() => next);
    draft = cloneConfig(configStore.get());
    unsavedBadge.classList.remove('visible');
  }

  function tryClose() {
    if (isDraftDirty()) {
      unsavedModal.classList.add('open');
    } else {
      closeDirect();
    }
  }

  document.getElementById('configBtn').addEventListener('click', open);
  document.getElementById('closeConfigBtn').addEventListener('click', tryClose);
  document.getElementById('cancelConfigBtn').addEventListener('click', tryClose);
  document.getElementById('saveConfigBtn').addEventListener('click', () => {
    if (!isDraftDirty()) {
      closeDirect();
      return;
    }
    saveDraft();
    closeDirect();
    showToast('Configuración guardada', '✓');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) tryClose();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (unsavedModal.classList.contains('open')) {
      unsavedModal.classList.remove('open');
      return;
    }
    if (modal.classList.contains('open')) tryClose();
  });

  // Modal unsaved
  document.getElementById('unsavedCancel').addEventListener('click', () => {
    unsavedModal.classList.remove('open');
  });
  document.getElementById('unsavedDiscard').addEventListener('click', () => {
    unsavedModal.classList.remove('open');
    closeDirect();
    showToast('Cambios descartados', '↺');
  });
  document.getElementById('unsavedSave').addEventListener('click', () => {
    unsavedModal.classList.remove('open');
    saveDraft();
    closeDirect();
    showToast('Configuración guardada', '✓');
  });
  unsavedModal.addEventListener('click', (e) => {
    if (e.target === unsavedModal) unsavedModal.classList.remove('open');
  });

  // Reset
  document.getElementById('resetConfigBtn').addEventListener('click', async () => {
    const ok = await showConfirm({
      title: '¿Restablecer configuración?',
      message: 'Se van a borrar tus preferencias de puestos, estados, filtros y apariencia.<br>Esto <strong>no</strong> se aplica hasta que guardes.',
      confirmText: 'Restablecer',
      danger: true,
    });
    if (!ok) return;
    draft = getDefaultConfig();
    renderAll();
    showToast('Configuración restablecida (recordá guardar)', '↺');
  });

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
    });
  });

  // ============================================================
  // Render
  // ============================================================
  function renderAll() {
    if (!draft) return;
    renderTags();
    renderPuestosList();
    renderHiddenList();
    renderEstados();
    renderDefaultEstado();
    renderFiltros();
    renderLogos();
    updateBadge();
  }

  // ------------------------------------------------------------
  // Panel: Roles
  // ------------------------------------------------------------
  function renderTags() {
    const active = new Set(draft.puestos.activeTags || []);
    document.getElementById('configTags').innerHTML = PUESTO_TAGS_LIST.map(t => {
      const sel = active.has(t.id);
      return `
        <button type="button"
                class="config-tag ${sel ? 'selected' : ''}"
                data-tag="${escapeHtml(t.id)}">
          <span>${t.icon}</span> ${escapeHtml(t.label)}
        </button>
      `;
    }).join('');
  }

  document.getElementById('configTags').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-tag');
    if (!btn) return;
    const tag = btn.dataset.tag;
    const active = new Set(draft.puestos.activeTags || []);
    if (active.has(tag)) active.delete(tag);
    else active.add(tag);
    draft.puestos.activeTags = [...active];
    renderAll();
  });

  function getVisiblePuestos() {
    const active = new Set(draft.puestos.activeTags || []);
    const hidden = new Set(draft.puestos.hidden || []);
    const custom = draft.puestos.custom || [];

    const customs = custom.filter(p => !hidden.has(p));

    const defaults = DEFAULT_PUESTOS.filter(p => {
      if (hidden.has(p)) return false;
      if (active.size === 0) return true;
      const tags = PUESTO_TAGS[p] || [];
      return tags.some(t => active.has(t));
    });

    return [...customs, ...defaults];
  }

  function renderPuestosList() {
    const list = getVisiblePuestos();
    const container = document.getElementById('configPuestosList');
    document.getElementById('configPuestosCount').textContent = list.length;

    if (list.length === 0) {
      container.innerHTML = `<div class="config-empty">No hay puestos con las categorías activas. Activá alguna o agregá uno custom.</div>`;
      return;
    }

    container.innerHTML = list.map(p => {
      const isCustom = (draft.puestos.custom || []).includes(p);
      return `
        <div class="config-puesto-item">
          <span>${escapeHtml(p)}</span>
          <button type="button"
                  class="remove"
                  data-puesto="${escapeHtml(p)}"
                  data-custom="${isCustom}"
                  title="${isCustom ? 'Eliminar' : 'Ocultar'}">×</button>
        </div>
      `;
    }).join('');
  }

  document.getElementById('configPuestosList').addEventListener('click', (e) => {
    const btn = e.target.closest('.remove');
    if (!btn) return;
    const puesto = btn.dataset.puesto;
    const isCustom = btn.dataset.custom === 'true';

    if (isCustom) {
      draft.puestos.custom = (draft.puestos.custom || []).filter(p => p !== puesto);
    } else {
      const hidden = new Set(draft.puestos.hidden || []);
      hidden.add(puesto);
      draft.puestos.hidden = [...hidden];
    }
    renderAll();
  });

  function renderHiddenList() {
    const hidden = draft.puestos.hidden || [];
    const section = document.getElementById('configHiddenSection');
    const container = document.getElementById('configHiddenList');

    if (hidden.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';

    container.innerHTML = hidden.map(p => `
      <div class="config-puesto-item hidden-puesto">
        <span>${escapeHtml(p)}</span>
        <button type="button" class="restore" data-puesto="${escapeHtml(p)}" title="Restaurar">+</button>
      </div>
    `).join('');
  }

  document.getElementById('configHiddenList').addEventListener('click', (e) => {
    const btn = e.target.closest('.restore');
    if (!btn) return;
    const puesto = btn.dataset.puesto;
    draft.puestos.hidden = (draft.puestos.hidden || []).filter(p => p !== puesto);
    renderAll();
  });

  const newPuestoInput = document.getElementById('configNewPuesto');

  function addCustom() {
    const val = newPuestoInput.value.trim();
    if (!val) return;
    const existe = (draft.puestos.custom || []).includes(val) || DEFAULT_PUESTOS.includes(val);
    if (existe) {
      showToast('Ese puesto ya existe', '!');
      return;
    }
    draft.puestos.custom = [...(draft.puestos.custom || []), val];
    draft.puestos.hidden = (draft.puestos.hidden || []).filter(p => p !== val);
    newPuestoInput.value = '';
    renderAll();
    showToast('Puesto agregado', '✓');
  }

  document.getElementById('configAddPuesto').addEventListener('click', addCustom);
  newPuestoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
  });

  // ------------------------------------------------------------
  // Panel: Initial states
  // ------------------------------------------------------------
  function renderEstados() {
    const activos = new Set(draft.estadosIniciales || []);
    document.getElementById('configEstados').innerHTML = WORKFLOW_STEPS.map(s => {
      const checked = activos.has(s.id);
      return `
        <label class="config-check ${checked ? 'checked' : ''}">
          <input type="checkbox" data-estado="${escapeHtml(s.id)}" ${checked ? 'checked' : ''}>
          <span class="icon">${s.icon}</span>
          <span>${escapeHtml(s.id)}</span>
        </label>
      `;
    }).join('');
  }

  document.getElementById('configEstados').addEventListener('change', (e) => {
    const input = e.target.closest('input[type="checkbox"]');
    if (!input) return;
    const estado = input.dataset.estado;
    const set = new Set(draft.estadosIniciales || []);

    if (input.checked) set.add(estado);
    else set.delete(estado);

    draft.estadosIniciales = [...set];

    if (set.size > 0 && !set.has(draft.estadoInicialDefault)) {
      draft.estadoInicialDefault = [...set][0];
    }

    renderAll();
  });

  function renderDefaultEstado() {
    const activos = draft.estadosIniciales || [];
    const container = document.getElementById('configDefaultEstado');

    if (activos.length === 0) {
      container.innerHTML = `<div class="config-empty">Activá al menos un estado arriba.</div>`;
      return;
    }

    container.innerHTML = activos.map(id => {
      const step = WORKFLOW_STEPS.find(s => s.id === id);
      const icon = step ? step.icon : '•';
      const sel = id === draft.estadoInicialDefault ? 'selected' : '';
      return `
        <button type="button"
                class="config-default-btn ${sel}"
                data-estado="${escapeHtml(id)}">
          ${icon} ${escapeHtml(id)}
        </button>
      `;
    }).join('');
  }

  document.getElementById('configDefaultEstado').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-default-btn');
    if (!btn) return;
    draft.estadoInicialDefault = btn.dataset.estado;
    renderAll();
  });

  // ------------------------------------------------------------
  // Panel: Filters
  // ------------------------------------------------------------
  function getFilterLabel(id) {
    const meta = CONFIG_FILTER_META[id];
    if (meta) return { label: meta.label, icon: meta.icon, builtin: true };
    const step = WORKFLOW_STEPS.find(s => s.id === id);
    if (step) return { label: step.short, icon: step.icon, builtin: false };
    return { label: id, icon: '•', builtin: false };
  }

  function renderFiltros() {
    const filtros = draft.filtros || [];
    document.getElementById('configFiltros').innerHTML = filtros.map((f, idx) => {
      const { label, icon, builtin } = getFilterLabel(f.id);
      return `
        <div class="config-filtro-item ${f.visible ? '' : 'oculto'}">
          <div class="drag-info">
            <span class="icon">${icon}</span>
            <span>${escapeHtml(label)}</span>
            ${builtin ? `<span class="builtin-tag">Fijo</span>` : ''}
          </div>
          <div class="config-filtro-actions">
            <button type="button"
                    class="config-icon-btn"
                    data-move="up"
                    data-idx="${idx}"
                    ${idx === 0 ? 'disabled' : ''}
                    title="Subir">↑</button>
            <button type="button"
                    class="config-icon-btn"
                    data-move="down"
                    data-idx="${idx}"
                    ${idx === filtros.length - 1 ? 'disabled' : ''}
                    title="Bajar">↓</button>
            <button type="button"
                    class="config-icon-btn ${f.visible ? 'eye-on' : 'eye-off'}"
                    data-toggle="${idx}"
                    title="${f.visible ? 'Ocultar filtro' : 'Mostrar filtro'}">
              ${f.visible ? '👁' : '🚫'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('configFiltros').addEventListener('click', (e) => {
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn && !moveBtn.disabled) {
      const idx = Number(moveBtn.dataset.idx);
      const dir = moveBtn.dataset.move === 'up' ? -1 : 1;
      const target = idx + dir;
      const filtros = cloneArray(draft.filtros);
      if (target < 0 || target >= filtros.length) return;
      [filtros[idx], filtros[target]] = [filtros[target], filtros[idx]];
      draft.filtros = filtros;
      renderAll();
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle]');
    if (toggleBtn) {
      const idx = Number(toggleBtn.dataset.toggle);
      const filtros = cloneArray(draft.filtros);
      filtros[idx] = { ...filtros[idx], visible: !filtros[idx].visible };
      draft.filtros = filtros;
      renderAll();
    }
  });

  // ------------------------------------------------------------
  // Panel: Appearance (logo)
  // ------------------------------------------------------------
  function renderLogos() {
    const actual = draft.logo || DEFAULT_LOGO;
    const container = document.getElementById('configLogos');

    container.innerHTML = LOGO_OPTIONS.map(opt => {
      const sel = opt.id === actual;
      return `
        <button type="button"
                class="config-logo-option ${sel ? 'selected' : ''}"
                data-logo="${escapeHtml(opt.id)}">
          <div class="config-logo-preview">${opt.svg}</div>
          <div class="config-logo-info">
            <strong>${escapeHtml(opt.label)}</strong>
            <span>${escapeHtml(opt.description)}</span>
          </div>
          <div class="config-logo-check"></div>
        </button>
      `;
    }).join('');
  }

  document.getElementById('configLogos').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-logo-option');
    if (!btn) return;
    const id = btn.dataset.logo;
    // Sólo seteamos si es distinto, para no marcar "sucio" sin cambios reales
    if ((draft.logo || DEFAULT_LOGO) !== id) {
      draft.logo = id;
      renderAll();
    }
  });

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------
  return { open, close: closeDirect };
}