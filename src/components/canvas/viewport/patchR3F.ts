import * as THREE from 'three';

/**
 * Patch THREE.Object3D.prototype to safely support React Three Fiber property piercing
 * on hyphenated data attributes (e.g. data-state, data-name, data-testid, data-bearing).
 *
 * In R3F, any hyphenated prop (e.g. `data-name="Sol"`) triggers property traversal via
 * `resolve(root, prop)`. If `object.data` is initially undefined, R3F's pierced property
 * fallback assigns `object.data = "Sol"` (a primitive string). Subsequent data-* props
 * attempt to read properties on that string, crashing the scene with:
 * "Error: R3F: Cannot set 'data-foo'. Ensure it is an object before setting 'foo'".
 *
 * By providing a persistent object container via a getter/setter on `THREE.Object3D.prototype.data`,
 * R3F cleanly populates `object.data[key]` without type errors or scene crashes.
 */
if (!Object.prototype.hasOwnProperty.call(THREE.Object3D.prototype, 'data')) {
  Object.defineProperty(THREE.Object3D.prototype, 'data', {
    get(this: THREE.Object3D & { _r3f_data?: Record<string, unknown> }) {
      if (!this._r3f_data) {
        this._r3f_data = {};
      }
      return this._r3f_data;
    },
    set(this: THREE.Object3D & { _r3f_data?: Record<string, unknown> }, val: unknown) {
      if (!this._r3f_data) {
        this._r3f_data = {};
      }
      if (typeof val === 'object' && val !== null) {
        Object.assign(this._r3f_data, val);
      }
    },
    configurable: true,
    enumerable: true,
  });
}
