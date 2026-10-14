// ============================================================
// Boot: instantiate the three reactive stores for a given user.
//
// Each store owns its localStorage key (prefixed with the user
// id), version, seed and migration chain. Migrations live in
// js/app/migrations.js and are shared with the backup-import
// path.
// ============================================================

import { Store } from '../app/store.js';
import {
  STORAGE_KEYS, STORAGE_VERSION, CONFIG_VERSION,
  SAMPLE_JOBS, getDefaultConfig,
} from '../app/constants.js';
import { migrateJob, migrateRef, migrateConfig } from '../app/migrations.js';

/**
 * @param {string} userId  the current user's id (from the session)
 * @returns {{
 *   jobsStore:   Store,
 *   refsStore:   Store,
 *   configStore: Store,
 * }}
 */
export function createStores(userId) {
  if (!userId) {
    throw new Error('[Stores] createStores() requires a userId');
  }

  const jobsStore = new Store(STORAGE_KEYS.JOBS(userId), [], {
    version: STORAGE_VERSION,
    seed: () => SAMPLE_JOBS.map(j => ({ ...j })),
    migrate: (data) => {
      if (Array.isArray(data)) return data.map(migrateJob);
      return data;
    },
  });

  const refsStore = new Store(STORAGE_KEYS.REFS(userId), [], {
    version: STORAGE_VERSION,
    migrate: (data) => {
      if (Array.isArray(data)) return data.map(migrateRef);
      return data;
    },
  });

  const configStore = new Store(STORAGE_KEYS.CONFIG(userId), getDefaultConfig(), {
    version: CONFIG_VERSION,
    seed: () => getDefaultConfig(),
    migrate: migrateConfig,
  });

  return { jobsStore, refsStore, configStore };
}