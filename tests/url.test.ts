import { describe, it, expect } from 'vitest';
import { resolveAppHref, resolveDataUrl } from '../src/utils/url';

describe('url utilities', () => {
  it('resolves public data asset URLs with base URL prefix', () => {
    expect(resolveDataUrl('data/search/core.json')).toBe('/data/search/core.json');
    expect(resolveDataUrl('/data/search/core.json')).toBe('/data/search/core.json');
  });

  it('resolves application route hrefs cleanly', () => {
    expect(resolveAppHref(undefined)).toBeUndefined();
    expect(resolveAppHref(null)).toBeUndefined();
    expect(resolveAppHref('')).toBe('');

    // External and anchor links are untouched
    expect(resolveAppHref('#section')).toBe('#section');
    expect(resolveAppHref('https://example.com')).toBe('https://example.com');
    expect(resolveAppHref('http://example.com')).toBe('http://example.com');
    expect(resolveAppHref('mailto:astronomy@example.com')).toBe('mailto:astronomy@example.com');
    expect(resolveAppHref('tel:+1234567890')).toBe('tel:+1234567890');

    // Standard internal routes in dev / root base
    expect(resolveAppHref('/galaxy')).toBe('/galaxy');
    expect(resolveAppHref('/system/sol?focus=earth')).toBe('/system/sol?focus=earth');
    expect(resolveAppHref('system/sol?focus=earth')).toBe('/system/sol?focus=earth');

    // Subpath base prefix in production (e.g. GitHub Pages)
    const originalBase = import.meta.env.BASE_URL;
    try {
      import.meta.env.BASE_URL = '/starmap/';
      expect(resolveAppHref('/galaxy')).toBe('/starmap/galaxy');
      expect(resolveAppHref('galaxy')).toBe('/starmap/galaxy');
      expect(resolveAppHref('/starmap/galaxy')).toBe('/starmap/galaxy');
      expect(resolveAppHref('/starmap?focus=sol')).toBe('/starmap?focus=sol');
      expect(resolveAppHref('/starmap')).toBe('/starmap');
    } finally {
      import.meta.env.BASE_URL = originalBase;
    }
  });
});
