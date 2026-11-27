import { describe, it, expect } from 'vitest';
import { stripCameraSearchParams } from './stripCameraSearchParams';

describe('stripCameraSearchParams', () => {
  it('returns original string when no camera query parameters are present', () => {
    expect(stripCameraSearchParams('')).toBe('');
    expect(stripCameraSearchParams('?focus=earth&layer=recent-discoveries')).toBe(
      '?focus=earth&layer=recent-discoveries',
    );
  });

  it('removes center, x, y, z, az, el, dist, zoom while preserving non-camera params', () => {
    expect(
      stripCameraSearchParams('?focus=earth&center=0,0,0&x=1&y=2&z=3&az=45&el=30&dist=12&zoom=1.5'),
    ).toBe('?focus=earth');
    expect(stripCameraSearchParams('?az=45&dist=12')).toBe('');
  });
});
