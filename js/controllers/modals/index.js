// ============================================================
// Controller: modals (facade)
//
// Each modal lives in its own file under this directory. This
// module wires them together and exposes the same public API
// that jobsController / refsController already consume.
// ============================================================

import { mountEditJobModal }   from './editJobModal.js';
import { mountEditRefModal }   from './editRefModal.js';
import { mountCloseJobModal }  from './closeJobModal.js';
import { mountHistoryModal }   from './historyModal.js';
import { mountNoteModal }      from './noteModal.js';
import { mountRefToJobModal }  from './refToJobModal.js';

/**
 * @param {import('../../app/store.js').Store} jobsStore
 * @param {import('../../app/store.js').Store} refsStore
 * @param {import('../../app/store.js').Store} configStore
 * @param {{ requestNewRole: (suggested:string)=>Promise<string|null> }} createRoleCtrl
 */
export function mountModalsController(jobsStore, refsStore, configStore, createRoleCtrl) {
  // Order matters only for refToJob → needs a reference to
  // editJob.open() to reveal the new card right after creating it.
  const editJob  = mountEditJobModal(jobsStore, configStore, createRoleCtrl);
  const editRef  = mountEditRefModal(refsStore);
  const closeJob = mountCloseJobModal(jobsStore, refsStore);
  const history  = mountHistoryModal(jobsStore, refsStore);
  const note     = mountNoteModal(jobsStore);
  const refToJob = mountRefToJobModal(jobsStore, refsStore, editJob);

  return {
    onOpenEdit:       editJob.open,
    onOpenRefEdit:    editRef.open,
    onClose:          closeJob.open,
    onOpenHistory:    history.openJob,
    onOpenRefHistory: history.openRef,
    onRefToJob:       refToJob.open,
    onAdvance: (id, opts = {}) => {
      const direction = opts.direction || 'next';
      if (direction === 'next') note.open(id, opts);
      else editJob.goBack(id);
    },
  };
}