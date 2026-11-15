import { describe, expect, it } from 'vitest';
import {
  extractUrlRouteStops,
  extractUrlJourneyOptionId,
  buildDirectionsTriggerHref,
  buildJourneyOptionHref,
  buildJourneyClearOptionHref,
  buildJourneyCloseHref,
} from './journeyProfilesAndUrls';

describe('journeyProfilesAndUrls', () => {
  describe('extractUrlRouteStops', () => {
    it('extracts route stops from URL query search strings', () => {
      expect(extractUrlRouteStops('?route=sol,tau-ceti')).toEqual(['sol', 'tau-ceti']);
      expect(extractUrlRouteStops('?route=sol%2Cproxima-centauri%2Csirius')).toEqual([
        'sol',
        'proxima-centauri',
        'sirius',
      ]);
      expect(extractUrlRouteStops('?route=')).toBeNull();
      expect(extractUrlRouteStops('')).toBeNull();
      expect(extractUrlRouteStops('?focus=sol')).toBeNull();
    });

    it('prepends default Step 1 origin when single stop provided', () => {
      expect(extractUrlRouteStops('?route=tau-ceti', 'galaxy')).toEqual(['sol', 'tau-ceti']);
      expect(extractUrlRouteStops('?route=mars', 'system')).toEqual(['earth', 'mars']);
      expect(extractUrlRouteStops('?route=moon', 'planet')).toEqual(['earth', 'moon']);
    });
  });

  describe('extractUrlJourneyOptionId', () => {
    it('extracts journeyOption ID from URL query search strings', () => {
      expect(extractUrlJourneyOptionId('?route=sol,tau-ceti&journeyOption=fusion-01c')).toBe(
        'fusion-01c',
      );
      expect(extractUrlJourneyOptionId('?route=sol,tau-ceti')).toBeNull();
    });

    it('extracts option ID embedded in route stops syntax', () => {
      expect(extractUrlJourneyOptionId('?route=sol:torchship-1g,tau-ceti')).toBe('torchship-1g');
    });
  });

  describe('buildDirectionsTriggerHref', () => {
    it('builds directions trigger href with default origins and preserves current search', () => {
      expect(
        buildDirectionsTriggerHref({
          focusedId: 'tau-ceti',
          viewScope: 'galaxy',
        }),
      ).toBe('/galaxy?focus=tau-ceti&route=sol,tau-ceti');

      expect(
        buildDirectionsTriggerHref({
          focusedId: 'sol',
          viewScope: 'galaxy',
        }),
      ).toBe('/galaxy?focus=sol&route=sol,sol');

      expect(
        buildDirectionsTriggerHref({
          focusedId: 'tau-ceti',
          viewScope: 'galaxy',
          currentPathname: '/galaxy',
          currentSearch: '?q=tau&focus=tau-ceti',
        }),
      ).toBe('/galaxy?q=tau&focus=tau-ceti&route=sol,tau-ceti');

      expect(
        buildDirectionsTriggerHref({
          focusedId: 'mars',
          systemId: 'sol',
          viewScope: 'system',
        }),
      ).toBe('/system/sol?route=earth,mars');
    });
  });

  describe('URL navigation href helpers', () => {
    it('builds option href correctly', () => {
      const href = buildJourneyOptionHref('/galaxy', '?q=sol', ['sol', 'tau-ceti'], 'torchship-1g');
      expect(href).toBe('/galaxy?q=sol&route=sol,tau-ceti&journeyOption=torchship-1g');
    });

    it('builds clear option href correctly', () => {
      const href = buildJourneyClearOptionHref('/galaxy', '?route=sol,tau-ceti&journeyOption=torchship-1g', ['sol', 'tau-ceti']);
      expect(href).toBe('/galaxy?route=sol,tau-ceti');
    });

    it('builds close href correctly', () => {
      const href = buildJourneyCloseHref('/galaxy', '?route=sol,tau-ceti&journeyOption=torchship-1g&focus=sol');
      expect(href).toBe('/galaxy?focus=sol');
    });
  });
});
