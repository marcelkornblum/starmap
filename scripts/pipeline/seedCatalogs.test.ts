import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  OFFICIAL_IAU_STAR_NAMES,
  RECONS_10PC_SUPPLEMENT,
  IAU_NAME_EXOWORLDS,
  AAVSO_VARIABLE_CATALOG,
  FULL_GALACTIC_STRUCTURES,
  FULL_SOLAR_SYSTEM_BODIES,
  CIRCUMSTELLAR_DISKS_CATALOG,
  DISK_HOST_ALIASES,
  SPECIAL_SYSTEM_NAME_MAP,
  CONSTELLATION_NAMES_RAW,
  resolveBuildTimestampIso,
  writeBuildEpochIso,
} from './seedCatalogs';

describe('seedCatalogs', () => {
  const originalEnvEpoch = process.env.SOURCE_DATE_EPOCH;
  const tempTestEpochFile = path.resolve('/tmp', `starmap-test-epoch-${Date.now()}.json`);

  beforeEach(() => {
    delete process.env.SOURCE_DATE_EPOCH;
  });

  afterEach(() => {
    if (originalEnvEpoch !== undefined) {
      process.env.SOURCE_DATE_EPOCH = originalEnvEpoch;
    } else {
      delete process.env.SOURCE_DATE_EPOCH;
    }
    if (fs.existsSync(tempTestEpochFile)) {
      fs.unlinkSync(tempTestEpochFile);
    }
  });

  it('exports populated and typed seed catalog collections', () => {
    expect(Object.keys(OFFICIAL_IAU_STAR_NAMES).length).toBeGreaterThan(50);
    expect(OFFICIAL_IAU_STAR_NAMES['hip-32349']?.properName).toBe('Sirius');

    expect(RECONS_10PC_SUPPLEMENT.length).toBeGreaterThan(10);
    expect(RECONS_10PC_SUPPLEMENT[0]?.name).toBeDefined();

    expect(Object.keys(IAU_NAME_EXOWORLDS).length).toBeGreaterThan(10);
    expect(IAU_NAME_EXOWORLDS['51 Pegasi b']?.starName).toBe('Helvetios');

    expect(Object.keys(AAVSO_VARIABLE_CATALOG).length).toBeGreaterThan(5);
    expect(AAVSO_VARIABLE_CATALOG.Betelgeuse?.varType).toContain('Supergiant');

    expect(FULL_GALACTIC_STRUCTURES.length).toBeGreaterThan(10);
    expect(FULL_GALACTIC_STRUCTURES.some((s) => s.id === 'hyades')).toBe(true);

    expect(FULL_SOLAR_SYSTEM_BODIES.length).toBeGreaterThan(10);
    expect(FULL_SOLAR_SYSTEM_BODIES.some((b) => b.id === 'sol')).toBe(true);

    expect(Object.keys(CIRCUMSTELLAR_DISKS_CATALOG).length).toBeGreaterThan(5);
    expect(CIRCUMSTELLAR_DISKS_CATALOG.Sol?.length).toBeGreaterThan(0);

    expect(Object.keys(DISK_HOST_ALIASES).length).toBeGreaterThan(5);
    expect(DISK_HOST_ALIASES.Sol).toContain('sun');

    expect(Object.keys(SPECIAL_SYSTEM_NAME_MAP).length).toBeGreaterThan(5);
    expect(SPECIAL_SYSTEM_NAME_MAP['rigil kentaurus']).toBe('Alpha Centauri');

    expect(CONSTELLATION_NAMES_RAW.length).toBeGreaterThan(20);
    expect(CONSTELLATION_NAMES_RAW).toContain('orion');
  });

  describe('resolveBuildTimestampIso', () => {
    it('returns overrideEpoch when provided', () => {
      const explicit = '2027-05-15T12:00:00.000Z';
      expect(resolveBuildTimestampIso(explicit)).toBe(explicit);
    });

    it('resolves numeric UNIX seconds from SOURCE_DATE_EPOCH', () => {
      process.env.SOURCE_DATE_EPOCH = '1704067200'; // 2024-01-01T00:00:00.000Z
      expect(resolveBuildTimestampIso()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('resolves ISO timestamp from SOURCE_DATE_EPOCH', () => {
      process.env.SOURCE_DATE_EPOCH = '2025-06-01T10:30:00.000Z';
      expect(resolveBuildTimestampIso()).toBe('2025-06-01T10:30:00.000Z');
    });

    it('falls back to build-epoch.json when no override or env is present', () => {
      const resolved = resolveBuildTimestampIso();
      expect(resolved).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('writeBuildEpochIso', () => {
    it('writes custom ISO timestamp to specified file path and returns it', () => {
      const targetIso = '2026-12-31T23:59:59.000Z';
      const result = writeBuildEpochIso(targetIso, tempTestEpochFile);

      expect(result).toBe(targetIso);
      expect(fs.existsSync(tempTestEpochFile)).toBe(true);

      const parsed = JSON.parse(fs.readFileSync(tempTestEpochFile, 'utf8'));
      expect(parsed.generatedAt).toBe(targetIso);
    });
  });
});
