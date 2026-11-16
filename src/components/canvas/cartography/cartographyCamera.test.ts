import { describe, it, expect } from 'vitest';
import {
  getStandardInitialCamera,
  STANDARD_CAMERA_DISTANCES,
} from './cartographyCamera';

describe('cartographyCamera', () => {
  it('defines standard camera distances for all frames', () => {
    expect(STANDARD_CAMERA_DISTANCES.galactic).toBe(28);
    expect(STANDARD_CAMERA_DISTANCES.system).toBe(22);
    expect(STANDARD_CAMERA_DISTANCES.planetary).toBe(120);
    expect(STANDARD_CAMERA_DISTANCES.component).toBe(12);
  });

  it('computes standard initial camera with elevation and yaw offset', () => {
    const cam = getStandardInitialCamera(100, [0, 0, 0], 50);
    expect(cam.up).toEqual([0, 0, 1]);
    expect(cam.target).toEqual([0, 0, 0]);
    expect(cam.fov).toBe(50);
    expect(cam.position[2]).toBeGreaterThan(0); // elevated
    expect(cam.position[0]).toBeLessThan(0); // facing +X
    expect(cam.position[1]).toBeLessThan(0); // offset towards -Y
  });
});
