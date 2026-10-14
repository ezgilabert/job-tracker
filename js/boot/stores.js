// ============================================================
// Boot: instantiate the three reactive stores.
//
// Each store owns its localStorage key, version, seed and
// migration chain. Migrations live in js/migrations.js and are
// shared with the backup-import path.
// ============================================================

import { Store } from '../store.js';
import {
  STORAGE_KEYS, STORAGE_VERSION, CONFIG_VERSION,
  SAMPLE_JOBS, getDefaultConfig,
} from '../constants.js';
import { migrateJob, migrateRef, migrateConfig } from '../migrations.js';

/**
 * @returns {{
 *   jobsStore:   Store,
 *   refsStore:   Store,
 *   configStore: Store,
 * }}
 */
export function createStores() {
  const jobsStore = new Store(STORAGE_KEYS.JOBS, [], {
    version: STORAGE_VERSION,
    seed: () => SAMPLE_JOBS.map(j => ({ ...j })),
    migrate: (data) => {
      if (Array.isArray(data)) return data.map(migrateJob);
      return data;
    },
  });

  const refsStore = new Store(STORAGE_KEYS.REFS, [], {
    version: STORAGE_VERSION,
    migrate: (data) => {
      if (Array.isArray(data)) return data.map(migrateRef);
      return data;
    },
  });

  const configStore = new Store(STORAGE_KEYS.CONFIG, getDefaultConfig(), {
    version: CONFIG_VERSION,
    seed: () => getDefaultConfig(),
    migrate: migrateConfig,
  });

  return { jobsStore, refsStore, configStore };
}