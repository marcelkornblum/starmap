import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SECTOR_SIZE_PC,
  getSectorCoordinate,
  formatSectorId,
  getSectorBounds,
} from './sectorMath';

describe('Spatial Sector Partitioning (formatSectorId & getSectorBounds)', () => {
  it('aligns coordinates using getSectorCoordinate with default and custom sizes', () => {
    expect(getSectorCoordinate(0)).toBe(0);
    expect(getSectorCoordinate(12.5)).toBe(0);
    expect(getSectorCoordinate(25)).toBe(25);
    expect(getSectorCoordinate(-0.1)).toBe(-25);
    expect(getSectorCoordinate(49, 50)).toBe(0);
    expect(getSectorCoordinate(50, 50)).toBe(50);
  });

  it('formats coordinates into standardized 3D sector IDs with default and custom sizes', () => {
    expect(formatSectorId(0, 0, 0)).toBe('sector_+000_+000_+000');
    expect(formatSectorId(12.5, -34.8, 48.2)).toBe('sector_+000_-050_+025');
    expect(formatSectorId(25, -25, 75)).toBe('sector_+025_-025_+075');
    expect(formatSectorId(-0.1, -0.1, -0.1)).toBe('sector_-025_-025_-025');
    expect(formatSectorId(45, -75, 120, 50)).toBe('sector_+000_-100_+100');
  });

  it('correctly resolves bounding boxes from sector IDs with default and custom sizes', () => {
    const bounds = getSectorBounds('sector_+025_-050_+000', DEFAULT_SECTOR_SIZE_PC);
    expect(bounds).not.toBeNull();
    expect(bounds?.min).toEqual({ x: 25, y: -50, z: 0 });
    expect(bounds?.max).toEqual({ x: 50, y: -25, z: 25 });

    const customBounds = getSectorBounds('sector_+000_-100_+100', 50);
    expect(customBounds).not.toBeNull();
    expect(customBounds?.min).toEqual({ x: 0, y: -100, z: 100 });
    expect(customBounds?.max).toEqual({ x: 50, y: -50, z: 150 });
  });

  it('returns null for invalid sector ID strings and invalid sizes', () => {
    expect(getSectorBounds('invalid_sector_name')).toBeNull();
    expect(getSectorBounds('sector_+12_-34')).toBeNull();
    expect(getSectorBounds('sector_abc_def_ghi')).toBeNull();
    expect(getSectorBounds('sector_+025_-050_+000', 0)).toBeNull();
    expect(getSectorBounds('sector_+025_-050_+000', -10)).toBeNull();
    expect(getSectorBounds('sector_+025_-050_+000', NaN)).toBeNull();
  });
});
