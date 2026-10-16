// ============================================================
// ToolbarFilter: reusable filter chip bar.
//
// Renders a list of chips from `getItems()`, tracks the active
// one, and calls `onChange(id)` when the user clicks.
//
// Usage:
//   const tf = mountToolbarFilter(document.getElementById('filters'), {
//     getItems: () => configStore.get().filters
//       .filter(f => f.visible)
//       .map(f => ({ id: f.id, label: getFilterLabel(f.id) })),
//     onChange: (id) => { currentFilter = id; renderList(); },
//   });
//   tf.render();
// ============================================================

import { escapeHtml } from '../app/utils.js';

export function mountToolbarFilter(container, {
  getItems,
  onChange = () => {},
  initial = 'all',
  buttonSelector = 'button[data-filter]',
} = {}) {
  let current = initial;

  function render() {
    const items = getItems() || [];
    container.innerHTML = items.map(it => {
      const active = it.id === current ? 'active' : '';
      return `<button type="button" data-filter="${escapeHtml(it.id)}" class="${active}">${escapeHtml(it.label)}</button>`;
    }).join('');
  }

  container.addEventListener('click', (e) => {
    const btn = e.target.closest(buttonSelector);
    if (!btn || !container.contains(btn)) return;
    const id = btn.dataset.filter;
    if (id === current) return;
    current = id;
    container.querySelectorAll(buttonSelector)
      .forEach(b => b.classList.toggle('active', b === btn));
    onChange(current);
  });

  return {
    render,
    getFilter: () => current,
    setFilter(id, { silent = false } = {}) {
      if (current === id) return;
      current = id;
      render();
      if (!silent) onChange(current);
    },
  };
}