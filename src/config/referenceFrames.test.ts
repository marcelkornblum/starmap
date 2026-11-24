import { describe, it, expect } from 'vitest';
import { EARTH_OBLIQUITY_DEG } from '../utils/astroCoordinates';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
} from './referenceFrames';

describe('referenceFrames config', () => {
  it('defines GALACTIC_FRAME with correct id, unit, radius, and camera bounds', () => {
    expect(GALACTIC_FRAME.id).toBe('galactic');
    expect(GALACTIC_FRAME.name).toBe('Galactic Frame');
    expect(GALACTIC_FRAME.unit).toBe('pc');
    expect(GALACTIC_FRAME.radius).toBe(10);
    expect(GALACTIC_FRAME.camera.minDistance).toBe(5);
    expect(GALACTIC_FRAME.camera.maxDistance).toBe(500);
    expect(GALACTIC_FRAME.camera.far).toBe(25_000);
    expect(GALACTIC_FRAME.camera.baseFov).toBe(45);
    expect(GALACTIC_FRAME.screenConstant).toBe(true);
    expect(GALACTIC_FRAME.referenceDistanceMultiplier).toBe(3.49);
    expect(GALACTIC_FRAME.bearings.length).toBe(2);
    expect(GALACTIC_FRAME.planeInclinationDeg).toBe(0);
    expect(GALACTIC_FRAME.planeAscendingNodeDeg).toBe(0);
  });

  it('defines SYSTEM_FRAME with correct id, unit, radius, and camera bounds', () => {
    expect(SYSTEM_FRAME.id).toBe('system');
    expect(SYSTEM_FRAME.name).toBe('System Frame');
    expect(SYSTEM_FRAME.unit).toBe('AU');
    expect(SYSTEM_FRAME.radius).toBe(6);
    expect(SYSTEM_FRAME.camera.minDistance).toBe(2);
    expect(SYSTEM_FRAME.camera.maxDistance).toBe(150);
    expect(SYSTEM_FRAME.camera.far).toBe(2_500);
    expect(SYSTEM_FRAME.camera.baseFov).toBe(35);
    expect(SYSTEM_FRAME.screenConstant).toBe(true);
    expect(SYSTEM_FRAME.referenceDistanceMultiplier).toBe(3.49);
    expect(SYSTEM_FRAME.bearings.length).toBe(1);
    expect(SYSTEM_FRAME.planeInclinationDeg).toBe(60.19);
    expect(SYSTEM_FRAME.planeAscendingNodeDeg).toBe(0);
  });

  it('defines PLANETARY_FRAME with correct id, unit, radius, and camera bounds', () => {
    expect(PLANETARY_FRAME.id).toBe('planetary');
    expect(PLANETARY_FRAME.name).toBe('Planetary Frame');
    expect(PLANETARY_FRAME.unit).toBe('km');
    expect(PLANETARY_FRAME.radius).toBe(65);
    expect(PLANETARY_FRAME.camera.minDistance).toBe(1.5);
    expect(PLANETARY_FRAME.camera.maxDistance).toBe(350);
    expect(PLANETARY_FRAME.camera.far).toBe(2_500);
    expect(PLANETARY_FRAME.camera.baseFov).toBe(30);
    expect(PLANETARY_FRAME.screenConstant).toBe(true);
    expect(PLANETARY_FRAME.referenceDistanceMultiplier).toBe(3.49);
    expect(PLANETARY_FRAME.bearings.length).toBe(0);
    expect(PLANETARY_FRAME.planeInclinationDeg).toBe(EARTH_OBLIQUITY_DEG);
    expect(PLANETARY_FRAME.planeAscendingNodeDeg).toBe(0);
  });
});
