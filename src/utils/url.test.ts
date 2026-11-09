import { describe, expect, it } from 'vitest';
import {
  HAZARDS_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  STAR_TYPES_GUIDE_PATH,
  buildHazardGuideHref,
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  hasExplicitFocusParam,
  parseLayerQueryParam,
  resolveAppHref,
  resolveDataUrl,
} from './url';

describe('url utils', () => {
  describe('resolveDataUrl', () => {
    it('prepends base URL to data assets', () => {
      expect(resolveDataUrl('/data/search/core.json')).toBe('/data/search/core.json');
    });
  });

  describe('resolveAppHref', () => {
    it('returns undefined for undefined input', () => {
      expect(resolveAppHref(undefined)).toBeUndefined();
    });

    it('returns empty string unchanged', () => {
      expect(resolveAppHref('')).toBe('');
    });

    it('leaves external or hash URLs unchanged', () => {
      expect(resolveAppHref('#anchor')).toBe('#anchor');
      expect(resolveAppHref('https://example.com')).toBe('https://example.com');
      expect(resolveAppHref('mailto:astronomy@starmap.local')).toBe('mailto:astronomy@starmap.local');
    });

    it('ensures leading slash on internal paths', () => {
      expect(resolveAppHref('galaxy?focus=sol')).toBe('/galaxy?focus=sol');
    });
  });

  describe('guide href builders', () => {
    it('builds star type guide href', () => {
      expect(buildStarTypeGuideHref('G2V')).toBe(`${STAR_TYPES_GUIDE_PATH}/G2V`);
      expect(buildStarTypeGuideHref('')).toBe(STAR_TYPES_GUIDE_PATH);
      expect(buildStarTypeGuideHref('Unknown')).toBe(STAR_TYPES_GUIDE_PATH);
    });

    it('builds planet type guide href', () => {
      expect(buildPlanetTypeGuideHref('terrestrial')).toBe(`${PLANET_TYPES_GUIDE_PATH}/terrestrial`);
      expect(buildPlanetTypeGuideHref('')).toBe(PLANET_TYPES_GUIDE_PATH);
      expect(buildPlanetTypeGuideHref('Unknown')).toBe(PLANET_TYPES_GUIDE_PATH);
    });

    it('builds metric guide href', () => {
      expect(buildMetricGuideHref('mass')).toBe(`${METRICS_GUIDE_PATH}/mass`);
      expect(buildMetricGuideHref('mass', 'sol')).toBe(`${METRICS_GUIDE_PATH}/mass?focus=sol`);
      expect(buildMetricGuideHref('')).toBe(METRICS_GUIDE_PATH);
    });

    it('builds hazard guide href', () => {
      expect(buildHazardGuideHref('radiation')).toBe(`${HAZARDS_GUIDE_PATH}/radiation`);
      expect(buildHazardGuideHref('')).toBe(HAZARDS_GUIDE_PATH);
      expect(buildHazardGuideHref('unknown')).toBe(HAZARDS_GUIDE_PATH);
    });
  });

  describe('parseLayerQueryParam', () => {
    it('returns null for empty or invalid params', () => {
      expect(parseLayerQueryParam(null)).toBeNull();
      expect(parseLayerQueryParam('')).toBeNull();
      expect(parseLayerQueryParam('   ')).toBeNull();
    });

    it('parses bare layer slugs', () => {
      expect(parseLayerQueryParam('recent-discoveries')).toEqual({
        layerSlug: 'recent-discoveries',
      });
    });

    it('strips overlay: and layer: prefixes', () => {
      expect(parseLayerQueryParam('overlay:recent-discoveries')).toEqual({
        layerSlug: 'recent-discoveries',
      });
      expect(parseLayerQueryParam('layer:project-hail-mary')).toEqual({
        layerSlug: 'project-hail-mary',
      });
    });

    it('parses layer and item slug pairs', () => {
      expect(parseLayerQueryParam('recent-discoveries:lhs-1140-b')).toEqual({
        layerSlug: 'recent-discoveries',
        itemSlug: 'lhs-1140-b',
      });
      expect(parseLayerQueryParam('layer:project-hail-mary:tau-ceti')).toEqual({
        layerSlug: 'project-hail-mary',
        itemSlug: 'tau-ceti',
      });
    });
  });

  describe('URL focus and slug extraction', () => {
    it('hasExplicitFocusParam checks if focus param exists and is non-empty', () => {
      expect(hasExplicitFocusParam('?focus=sol')).toBe(true);
      expect(hasExplicitFocusParam('?focus=')).toBe(false);
      expect(hasExplicitFocusParam('')).toBe(false);
    });
  });
});
