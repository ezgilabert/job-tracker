// ============================================================
// Reactive store with localStorage persistence and migration
// ============================================================

export class Store {
  /**
   * @param {string} key  localStorage key
   * @param {any} initialValue  default value
   * @param {{
   *   version?: number,
   *   migrate?: (data:any, from:number, to:number)=>any,
   *   seed?: () => any,
   * }} opts
   */
  constructor(key, initialValue, opts = {}) {
    this.key = key;
    this.version = opts.version ?? 1;
    this.migrate = opts.migrate ?? null;
    this.seed = opts.seed ?? null;
    this.listeners = new Set();
    this.state = this.#load(initialValue);
  }

  #load(initialValue) {
    let stored = null;
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) stored = JSON.parse(raw);
    } catch (e) {
      console.warn(`[Store:${this.key}] corrupt JSON, ignored`, e);
    }

    // No stored data → seed or default
    if (stored === null) {
      const data = this.seed ? this.seed() : initialValue;
      const wrapped = { version: this.version, data };
      this.#persistRaw(wrapped);
      return wrapped;
    }

    // Wrapped format { version, data }
    if (
      stored &&
      typeof stored === 'object' &&
      !Array.isArray(stored) &&
      'version' in stored
    ) {
      if (stored.version !== this.version && this.migrate) {
        stored.data = this.migrate(stored.data, stored.version, this.version);
        stored.version = this.version;
        this.#persistRaw(stored);
      }
      return stored;
    }

    // Legacy flat array → migrate
    const data = this.migrate ? this.migrate(stored, 0, this.version) : stored;
    const wrapped = { version: this.version, data };
    this.#persistRaw(wrapped);
    return wrapped;
  }

  #persistRaw(obj) {
    try {
      localStorage.setItem(this.key, JSON.stringify(obj));
    } catch (e) {
      console.error(`[Store:${this.key}] persist failed`, e);
    }
  }

  get() {
    return this.state.data;
  }

  /**
   * @param {(current:any)=>any} updater  must return the next state
   */
  update(updater) {
    const next = updater(this.state.data);
    if (next === undefined) {
      console.warn('[Store] updater returned undefined; ignored');
      return;
    }
    this.state.data = next;
    this.#persistRaw(this.state);
    this.#emit();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.state.data); // emit current state immediately
    return () => this.listeners.delete(fn);
  }

  #emit() {
    for (const fn of this.listeners) fn(this.state.data);
  }
}