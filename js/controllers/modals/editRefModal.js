// ============================================================
// Modal: Edit referral
// ============================================================

import { showToast } from '../../ui/feedback/toast.js';
import { mountChips } from '../../ui/form/chips.js';
import { createModal } from '../../ui/modal.js';
import { valueOf, setVal } from '../../app/utils.js';
import { t } from '../../i18n/index.js';

export function mountEditRefModal(refsStore) {
  let editingId = null;

  const modal = createModal(document.getElementById('refEditModal'), {
    onClose: () => { editingId = null; },
  });

  const relationshipChips = mountChips(
    document.getElementById('refEditRelationshipChips'),
    { onChange: () => {}, allowMultiple: true }
  );
  const statusChips = mountChips(
    document.getElementById('refEditStatusChips'),
    { onChange: () => {} }
  );

  function open(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    editingId = id;

    setVal('refEditName', r.name);
    setVal('refEditRole', r.role || '');
    setVal('refEditContact', r.contact || '');
    setVal('refEditLink', r.link || '');
    setVal('refEditNotes', r.notes || '');

    const relationshipValue = Array.isArray(r.relationship)
      ? r.relationship
      : (r.relationship ? [r.relationship] : []);
    relationshipChips.setValue(relationshipValue);

    statusChips.setValue(r.status || 'Pending');

    modal.open();
  }

  document.getElementById('refCancelEdit').addEventListener('click', () => modal.close());

  document.getElementById('refSaveEdit').addEventListener('click', () => {
    if (!editingId) return;

    const relationshipValue = relationshipChips.getValue() || [];

    refsStore.update(refs => refs.map(r => {
      if (r.id !== editingId) return r;
      return {
        ...r,
        name:    valueOf('refEditName'),
        role:    valueOf('refEditRole'),
        contact: valueOf('refEditContact'),
        link:    valueOf('refEditLink'),
        relationship: Array.isArray(relationshipValue) ? relationshipValue : [],
        status:  statusChips.getValue() || 'Pending',
        notes:   valueOf('refEditNotes'),
      };
    }));

    modal.close();
    showToast(t('toast.refUpdated'), 'icon-check');
  });

  return { open, close: () => modal.close() };
}