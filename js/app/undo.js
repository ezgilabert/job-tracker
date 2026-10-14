// ============================================================
// Undo: safety net for destructive actions.
//
// `withUndo(stores, message, mutation)` snapshots one or more
// stores, runs the mutation, and shows an "Undo" toast. If the
// user clicks Undo within the toast lifetime, all snapshots are
// restored and a confirmation toast fires.
//
// Only the latest action stays undoable. Starting a new one
// dismisses the previous toast so the user never restores an
// intermediate state.
// ============================================================

import { showToast, showActionToast } from '../ui/feedback/toast.js';
import { t } from '../i18n/index.js';

let activeUndo = null;

/**
 * Runs a mutation on one or more stores with a 5-second undo
 * window.
 *
 * @param {import('./store.js').Store | import('./store.js').Store[]} stores
 * @param {string} message       the toast message, already translated
 * @param {() => void} mutation  performs the change
 * @param {string} [icon]        short emoji for the toast
 */
export function withUndo(stores, message, mutation, icon = '↺') {
  // Only one undo slot at a time.
  if (activeUndo) {
    activeUndo.dismiss();
    activeUndo = null;
  }

  const arr = Array.isArray(stores) ? stores : [stores];
  const snapshots = arr.map(s => s.get());

  mutation();

  activeUndo = showActionToast(message, icon, {
    actionLabel: t('action.undo'),
    duration: 5000,
    onAction: () => {
      arr.forEach((s, i) => s.update(() => snapshots[i]));
      activeUndo = null;
      showToast(t('toast.undone'), '↺');
    },
  });
}