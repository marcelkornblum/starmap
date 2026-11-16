import { describe, expect, it } from 'vitest';
import {
  buildCenterEntityHref,
  extractUrlSceneCameraState,
} from './detailsCamera';

describe('detailsCamera', () => {
  describe('extractUrlSceneCameraState', () => {
    it('extracts camera state numbers from URL search string', () => {
      const state = extractUrlSceneCameraState('?x=1.5&y=-2.0&z=3.25&az=45&el=-10&dist=12.5&zoom=2');
      expect(state).toEqual({
        x: 1.5,
        y: -2.0,
        z: 3.25,
        az: 45,
        el: -10,
        dist: 12.5,
        zoom: 2,
      });
    });

    it('extracts center slug if present', () => {
      const state = extractUrlSceneCameraState('?center=Tau%20Ceti');
      expect(state.center).toBe('tau-ceti');
    });

    it('returns the same frozen empty singleton for empty or non-camera search strings', () => {
      const empty1 = extractUrlSceneCameraState('');
      const empty2 = extractUrlSceneCameraState('?focus=sol');
      const empty3 = extractUrlSceneCameraState('?select=earth');
      expect(empty1).toBe(empty2);
      expect(empty2).toBe(empty3);
      expect(Object.isFrozen(empty1)).toBe(true);
    });
  });

  describe('buildCenterEntityHref', () => {
    it('returns undefined if focusId is not provided', () => {
      expect(buildCenterEntityHref('galaxy', 'sol', undefined)).toBeUndefined();
    });

    it('builds center href for galaxy scope', () => {
      expect(buildCenterEntityHref('galaxy', 'sol', 'alpha-centauri')).toBe(
        '/galaxy?center=alpha-centauri&focus=alpha-centauri',
      );
    });

    it('builds center href for system scope', () => {
      expect(buildCenterEntityHref('system', 'sol', 'earth')).toBe(
        '/system/sol?center=earth&focus=earth',
      );
    });

    it('builds center href for planet scope', () => {
      expect(buildCenterEntityHref('planet', 'jupiter', 'europa')).toBe(
        '/planet/jupiter?center=europa&focus=europa',
      );
    });
  });
});
