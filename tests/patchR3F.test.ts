import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyProps } from '@react-three/fiber';
import '../src/components/canvas/viewport/patchR3F';

describe('R3F Object3D data property patch (patchR3F)', () => {
  it('provides a safe data container on THREE.Object3D instances', () => {
    const obj = new THREE.Object3D();
    expect(obj.data).toBeDefined();
    expect(typeof obj.data).toBe('object');
  });

  it('allows safe property traversal without crashing on nested pierced properties', () => {
    const obj = new THREE.Object3D();
    // Simulate R3F setting data-planets-count={8}
    expect(() => {
      applyProps(obj, { 'data-planets-count': 8 });
    }).not.toThrow();

    // Second render update: before our fix, this threw:
    // "Error: R3F: Cannot set 'data-planets-count'. Ensure it is an object before setting 'count'."
    expect(() => {
      applyProps(obj, { 'data-planets-count': 8 });
    }).not.toThrow();
  });

  it('handles multi-hyphen pierced properties across multiple re-renders and property variations', () => {
    const group = new THREE.Group();

    expect(() => {
      applyProps(group, {
        'data-state-forced': 'true',
        'data-leg-id': 'leg-42',
        'data-step-index': 3,
        'data-waypoint-role': 'destination',
        'data-active-method': 'transit',
        'data-deeply-nested-pierced-prop': 'val',
      });
    }).not.toThrow();

    // Re-apply same and mutated props
    expect(() => {
      applyProps(group, {
        'data-state-forced': 'false',
        'data-leg-id': 'leg-43',
        'data-step-index': 4,
        'data-waypoint-role': 'origin',
        'data-active-method': 'warp',
        'data-deeply-nested-pierced-prop': 'val-next',
      });
    }).not.toThrow();
  });

  it('safely handles direct reading and writing of arbitrary nested properties', () => {
    const obj = new THREE.Object3D();
    const data = obj.data as Record<string, any>;

    expect(() => {
      data.alpha.beta.gamma.delta = 42;
    }).not.toThrow();

    expect(typeof data.alpha.beta.gamma).toBe('object');
  });

  it('safely supports Object.assign / setter on object.data', () => {
    const obj = new THREE.Object3D();
    expect(() => {
      obj.data = { foo: 'bar', answer: 42 };
    }).not.toThrow();
  });
});
