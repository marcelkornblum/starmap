import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
} from '../../../config/referenceFrames';
import { createCustomReferenceFrame } from './referenceFrame';

describe('referenceFrame presets & maths', () => {
  it('defines GALACTIC_FRAME with correct spatial units, bearings, and datum plane', () => {
    expect(GALACTIC_FRAME.id).toBe('galactic');
    expect(GALACTIC_FRAME.unit).toBe('pc');
    expect(GALACTIC_FRAME.radius).toBe(10);
    expect(GALACTIC_FRAME.datumPlane.enabled).toBe(true);
    expect(GALACTIC_FRAME.datumPlane.planarGrid).toBe(true);
    expect(GALACTIC_FRAME.datumPlane.planarGridGap).toBe(2.5);
    expect(GALACTIC_FRAME.datumPlane.fill).toBe(true);
    expect(GALACTIC_FRAME.datumPlane.footprints).toBe(true);
    expect(GALACTIC_FRAME.coordinateFins.polarDialExpansion).toBe(true);
    expect(GALACTIC_FRAME.bearings.length).toBe(2);
    expect(GALACTIC_FRAME.bearings[0].id).toBe('core');
    expect(GALACTIC_FRAME.bearings[1].id).toBe('orbital');
  });

  it('defines SYSTEM_FRAME with smaller radius than galactic, shared planar elements, and invariable plane orientation', () => {
    expect(SYSTEM_FRAME.id).toBe('system');
    expect(SYSTEM_FRAME.unit).toBe('AU');
    expect(SYSTEM_FRAME.radius).toBe(6);
    expect(SYSTEM_FRAME.radius).toBeLessThan(GALACTIC_FRAME.radius);
    expect(SYSTEM_FRAME.datumPlane.enabled).toBe(true);
    expect(SYSTEM_FRAME.datumPlane.planarGrid).toBe(true);
    expect(SYSTEM_FRAME.datumPlane.planarGridGap).toBe(1.5);
    expect(SYSTEM_FRAME.datumPlane.fill).toBe(true);
    expect(SYSTEM_FRAME.datumPlane.footprints).toBe(true);
    expect(SYSTEM_FRAME.bearings.length).toBe(1);
    expect(SYSTEM_FRAME.bearings[0].id).toBe('orbital');
    expect(SYSTEM_FRAME.orientation).toBeDefined();
  });

  it('defines PLANETARY_FRAME with calibrated planetary radius, shared planar elements, and axial tilt orientation without core bearing', () => {
    expect(PLANETARY_FRAME.id).toBe('planetary');
    expect(PLANETARY_FRAME.unit).toBe('km');
    expect(PLANETARY_FRAME.radius).toBe(65);
    expect(PLANETARY_FRAME.datumPlane.enabled).toBe(true);
    expect(PLANETARY_FRAME.datumPlane.fill).toBe(true);
    expect(PLANETARY_FRAME.datumPlane.planarGrid).toBe(true);
    expect(PLANETARY_FRAME.datumPlane.planarGridGap).toBe(10.0);
    expect(PLANETARY_FRAME.datumPlane.footprints).toBe(true);
    expect(PLANETARY_FRAME.bearings.length).toBe(0);
    expect(PLANETARY_FRAME.orientation).toBeDefined();
  });

  it('creates custom reference frames via createCustomReferenceFrame', () => {
    const custom = createCustomReferenceFrame(GALACTIC_FRAME, {
      id: 'custom-scaled',
      radius: 25,
      datumPlane: {
        ...GALACTIC_FRAME.datumPlane,
        planarGrid: false,
      },
    });
    expect(custom.id).toBe('custom-scaled');
    expect(custom.radius).toBe(25);
    expect(custom.datumPlane.planarGrid).toBe(false);
    expect(custom.datumPlane.fill).toBe(true);
  });

  describe('World-Space Instrument Tilt & ScreenEdge Orientation', () => {
    it('computes downward tilt when focus point has positive Z altitude', () => {
      const rGc = 2000;
      const focusPoint = new THREE.Vector3(0, 0, 100);
      const vCore = new THREE.Vector3(rGc - focusPoint.x, -focusPoint.y, -focusPoint.z).normalize();
      expect(vCore.z).toBeLessThan(0);

      const vOrbital = new THREE.Vector3(-vCore.y, vCore.x, 0).normalize();
      expect(vOrbital.z).toBe(0);

      const vZenith = new THREE.Vector3().crossVectors(vCore, vOrbital).normalize();
      expect(vZenith.z).toBeGreaterThan(0);

      const basis = new THREE.Matrix4().makeBasis(vCore, vOrbital, vZenith);
      const q = new THREE.Quaternion().setFromRotationMatrix(basis);
      expect(q.x).toBeCloseTo(0, 3);
      expect(q.y).toBeGreaterThan(0);
      expect(q.z).toBeCloseTo(0, 3);
    });

    it('suppresses tilt when frame does not declare a core bearing', () => {
      const hasCore = SYSTEM_FRAME.bearings.some((b) => b.id === 'core');
      expect(hasCore).toBe(false);

      const hasPlanetaryCore = PLANETARY_FRAME.bearings.some((b) => b.id === 'core');
      expect(hasPlanetaryCore).toBe(false);
    });
  });
});
