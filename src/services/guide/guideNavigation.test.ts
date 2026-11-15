import { describe, it, expect } from 'vitest';
import {
  extractFocusIdFromSearch,
  GUIDE_SECTION_NAV_ITEMS,
} from './guideNavigation';
import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
} from '../../content/guide';

describe('guideNavigation', () => {
  describe('extractFocusIdFromSearch', () => {
    it('extracts focus id correctly from query string', () => {
      expect(extractFocusIdFromSearch('?focus=sol')).toBe('sol');
      expect(extractFocusIdFromSearch('?a=1&focus=tau-ceti&b=2')).toBe('tau-ceti');
      expect(extractFocusIdFromSearch('?focus=proxima%20centauri')).toBe('proxima centauri');
      expect(extractFocusIdFromSearch('')).toBe('');
      expect(extractFocusIdFromSearch('?other=value')).toBe('');
    });

    it('handles whitespace around search query string', () => {
      expect(extractFocusIdFromSearch('   ?focus=earth   ')).toBe('earth');
    });
  });

  describe('GUIDE_SECTION_NAV_ITEMS', () => {
    it('contains navigation definitions for all 4 guide sections', () => {
      expect(GUIDE_SECTION_NAV_ITEMS).toHaveLength(4);
      expect(GUIDE_SECTION_NAV_ITEMS.map((item) => item.id)).toEqual([
        'star-types',
        'planet-types',
        'metrics',
        'hazards',
      ]);
      expect(GUIDE_SECTION_NAV_ITEMS.map((item) => item.href)).toEqual([
        STAR_TYPES_GUIDE_PATH,
        PLANET_TYPES_GUIDE_PATH,
        METRICS_GUIDE_PATH,
        HAZARDS_GUIDE_PATH,
      ]);
    });
  });
});
