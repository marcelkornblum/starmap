import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

describe('Prototype Purity (AUD-102)', () => {
  it('guarantees THREE.Object3D.prototype is not monkey-patched with a data property', () => {
    expect(Object.prototype.hasOwnProperty.call(THREE.Object3D.prototype, 'data')).toBe(false);
    const obj = new THREE.Object3D();
    expect((obj as unknown as { data?: unknown }).data).toBeUndefined();
  });

  it('guarantees THREE.Group, THREE.Mesh, and THREE.Points retain native prototype inheritance', () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh();
    const points = new THREE.Points();

    expect((group as unknown as { data?: unknown }).data).toBeUndefined();
    expect((mesh as unknown as { data?: unknown }).data).toBeUndefined();
    expect((points as unknown as { data?: unknown }).data).toBeUndefined();
  });
});
