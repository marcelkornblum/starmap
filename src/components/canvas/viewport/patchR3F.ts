import * as THREE from 'three';

/**
 * Creates a recursive, safe proxy for R3F pierced property assignment.
 * When R3F encounters multi-hyphen props like `data-planets-count={8}`, it splits
 * the prop path by '-' and traverses each intermediate key (`object.data.planets.count`).
 * Returning a recursive proxy ensures that intermediate traversals never evaluate
 * to primitives, preventing "Cannot set 'data-...'. Ensure it is an object before setting '...'"
 * errors during initial mount and subsequent re-renders.
 */
function createSafeDataProxy(store = new Map<string, unknown>(), prefix = ''): Record<string, unknown> {
  return new Proxy(Object.create(null), {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (
        prop === 'isObject3D' ||
        prop === 'isGroup' ||
        prop === 'constructor' ||
        prop === 'prototype' ||
        prop === 'then' ||
        prop === '$$typeof'
      ) {
        return undefined;
      }
      if (prop === 'toJSON') {
        return () => Object.fromEntries(store.entries());
      }
      if (prop === 'toString') {
        return () => '[object SafeDataProxy]';
      }
      const fullPath = prefix ? `${prefix}-${prop}` : prop;
      return createSafeDataProxy(store, fullPath);
    },
    set(_target, prop, value) {
      if (typeof prop !== 'string') return false;
      const fullPath = prefix ? `${prefix}-${prop}` : prop;
      store.set(fullPath, value);
      return true;
    },
    has(_target, prop) {
      if (typeof prop !== 'string') return false;
      const fullPath = prefix ? `${prefix}-${prop}` : prop;
      return store.has(fullPath);
    },
    deleteProperty(_target, prop) {
      if (typeof prop !== 'string') return false;
      const fullPath = prefix ? `${prefix}-${prop}` : prop;
      return store.delete(fullPath);
    },
    ownKeys() {
      return Array.from(store.keys());
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'string' && store.has(prop)) {
        return {
          value: store.get(prop),
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
      return undefined;
    },
  });
}

declare module 'three' {
  interface Object3D {
    data?: Record<string, unknown>;
  }
}

/**
 * Patch THREE.Object3D.prototype to safely support React Three Fiber property piercing
 * on hyphenated data attributes (e.g. data-state, data-name, data-testid, data-planets-count).
 *
 * In R3F, any hyphenated prop triggers property traversal via `resolve(root, prop)`.
 * By providing a persistent recursive proxy via a getter/setter on `THREE.Object3D.prototype.data`,
 * R3F cleanly populates `object.data[key]` without type errors or scene crashes.
 */
if (!Object.prototype.hasOwnProperty.call(THREE.Object3D.prototype, 'data')) {
  Object.defineProperty(THREE.Object3D.prototype, 'data', {
    get(this: THREE.Object3D & { _r3f_data?: Record<string, unknown>; _r3f_store?: Map<string, unknown> }) {
      if (!this._r3f_data) {
        this._r3f_store = new Map<string, unknown>();
        this._r3f_data = createSafeDataProxy(this._r3f_store);
      }
      return this._r3f_data;
    },
    set(this: THREE.Object3D & { _r3f_data?: Record<string, unknown>; _r3f_store?: Map<string, unknown> }, val: unknown) {
      if (!this._r3f_data) {
        this._r3f_store = new Map<string, unknown>();
        this._r3f_data = createSafeDataProxy(this._r3f_store);
      }
      if (typeof val === 'object' && val !== null) {
        Object.assign(this._r3f_data, val);
      }
    },
    configurable: true,
    enumerable: true,
  });
}
