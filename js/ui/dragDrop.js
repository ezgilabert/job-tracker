// ============================================================
// DragDrop: reorderable list helper.
//
// Attaches dragstart / dragover / dragleave / drop / dragend
// to a container and calls `onReorder(orderedIds)` with the
// new order after a drop. The caller decides how to persist.
//
// Usage:
//   const dd = mountDragDrop(listEl, {
//     itemSelector: '.job',
//     onReorder: (ids) => jobsStore.update(...),
//   });
//   dd.destroy(); // optional
// ============================================================

export function mountDragDrop(listEl, {
  itemSelector = '.job',
  skipInteractive = 'button, a, input, textarea, select',
  onReorder = () => {},
} = {}) {
  let dragging = null;

  function getAfterElement(y) {
    const els = [...listEl.querySelectorAll(`${itemSelector}:not(.dragging)`)];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function onDragStart(e) {
    const card = e.target.closest(itemSelector);
    if (!card) return;
    if (e.target.closest(skipInteractive)) { e.preventDefault(); return; }
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
    dragging = card;
  }

  function onDragEnd() {
    if (dragging) dragging.classList.remove('dragging');
    listEl.querySelectorAll(itemSelector).forEach(c => c.classList.remove('drag-over'));
    dragging = null;
  }

  function onDragOver(e) {
    e.preventDefault();
    if (!dragging) return;
    const after = getAfterElement(e.clientY);
    listEl.querySelectorAll(itemSelector).forEach(c => c.classList.remove('drag-over'));
    if (after == null) listEl.appendChild(dragging);
    else {
      after.classList.add('drag-over');
      listEl.insertBefore(dragging, after);
    }
  }

  function onDragLeave(e) {
    const card = e.target.closest(itemSelector);
    if (card) card.classList.remove('drag-over');
  }

  function onDrop(e) {
    e.preventDefault();
    if (!dragging) return;
    const ids = [...listEl.querySelectorAll(itemSelector)]
      .map(c => Number(c.dataset.id));
    onReorder(ids);
  }

  listEl.addEventListener('dragstart', onDragStart);
  listEl.addEventListener('dragend', onDragEnd);
  listEl.addEventListener('dragover', onDragOver);
  listEl.addEventListener('dragleave', onDragLeave);
  listEl.addEventListener('drop', onDrop);

  return {
    destroy() {
      listEl.removeEventListener('dragstart', onDragStart);
      listEl.removeEventListener('dragend', onDragEnd);
      listEl.removeEventListener('dragover', onDragOver);
      listEl.removeEventListener('dragleave', onDragLeave);
      listEl.removeEventListener('drop', onDrop);
    },
  };
}