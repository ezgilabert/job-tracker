// ============================================================
// Store reactivo con persistencia y migración
// ============================================================

export class Store {
  /**
   * @param {string} key  clave de localStorage
   * @param {any} initialValue  valor por defecto
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
      console.warn(`[Store:${this.key}] JSON corrupto, se ignora`, e);
    }

    // Sin datos → seed o default
    if (stored === null) {
      const data = this.seed ? this.seed() : initialValue;
      const wrapped = { version: this.version, data };
      this.#persistRaw(wrapped);
      return wrapped;
    }

    // Formato nuevo { version, data }
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

    // Formato viejo (array plano) → migrar
    const data = this.migrate ? this.migrate(stored, 0, this.version) : stored;
    const wrapped = { version: this.version, data };
    this.#persistRaw(wrapped);
    return wrapped;
  }

  #persistRaw(obj) {
    try {
      localStorage.setItem(this.key, JSON.stringify(obj));
    } catch (e) {
      console.error(`[Store:${this.key}] no se pudo persistir`, e);
    }
  }

  get() {
    return this.state.data;
  }

  /**
   * @param {(current:any)=>any} updater  debe devolver el nuevo estado
   */
  update(updater) {
    const next = updater(this.state.data);
    if (next === undefined) {
      console.warn('[Store] updater devolvió undefined; ignorado');
      return;
    }
    this.state.data = next;
    this.#persistRaw(this.state);
    this.#emit();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.state.data); // llamada inicial
    return () => this.listeners.delete(fn);
  }

  #emit() {
    for (const fn of this.listeners) fn(this.state.data);
  }
}