import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { useSettingsStore } from '../../stores/useSettingsStore';
import {
  THEME_PALETTES,
  applyTheme,
  applyPalette,
  applyThemePalette,
  resolveThemeBrowserColor,
  syncThemeColorMeta,
} from './paletteTheme';

const mockAttrs = new Map<string, string>();
const mockDocumentElement = {
  setAttribute: (key: string, value: string) => {
    mockAttrs.set(key, String(value));
  },
  getAttribute: (key: string) => mockAttrs.get(key) ?? null,
  removeAttribute: (key: string) => {
    mockAttrs.delete(key);
  },
};

interface MockMetaElement {
  attributes: Map<string, string>;
  setAttribute: (key: string, value: string) => void;
  getAttribute: (key: string) => string | null;
}

function createMockMetaElement(): MockMetaElement {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (key: string, value: string) => {
      attributes.set(key, String(value));
    },
    getAttribute: (key: string) => attributes.get(key) ?? null,
  };
}

let headChildren: MockMetaElement[] = [];

const originalDocument = globalThis.document;

describe('Theme & Palette Management (paletteTheme)', () => {
  beforeEach(() => {
    mockAttrs.clear();
    headChildren = [];
    (globalThis as unknown as { document: unknown }).document = {
      documentElement: mockDocumentElement,
      head: {
        appendChild: (el: MockMetaElement) => {
          headChildren.push(el);
          return el;
        },
      },
      querySelector: (selector: string) => {
        if (selector === 'meta[name="theme-color"]') {
          return headChildren.find((el) => el.getAttribute('name') === 'theme-color') ?? null;
        }
        return null;
      },
      createElement: () => createMockMetaElement(),
    };
    useSettingsStore.getState().resetSettings();
  });

  afterAll(() => {
    if (originalDocument !== undefined) {
      globalThis.document = originalDocument;
    } else {
      delete (globalThis as unknown as { document?: unknown }).document;
    }
  });

  describe('Literal Token Palette Definitions', () => {
    it('defines canonical prodigy palette with correct hue angles and metadata', () => {
      expect(THEME_PALETTES.prodigy.id).toBe('prodigy');
      expect(THEME_PALETTES.prodigy.label).toBe('Prodigy');
      expect(THEME_PALETTES.prodigy.tagline).toBe('Abyssal Verdigris / Phosphor Bio-Jade');
      expect(THEME_PALETTES.prodigy.surfaceHue).toBe(198);
      expect(THEME_PALETTES.prodigy.focusHue).toBe(166);
      expect(THEME_PALETTES.prodigy.accentColorDark).toBe('oklch(81.5% 0.148 166)');
      expect(THEME_PALETTES.prodigy.accentColorLight).toBe('oklch(46.0% 0.140 166)');
      expect(THEME_PALETTES.prodigy.surfaceColorDark).toBe('oklch(10.5% 0.024 198)');
      expect(THEME_PALETTES.prodigy.surfaceColorLight).toBe('oklch(97.2% 0.008 198)');
    });
  });

  describe('Literal Tokens Swap Functions', () => {
    it('applies theme mode to DOM and store', () => {
      applyTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(useSettingsStore.getState().theme).toBe('light');

      applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('applies palette to DOM and store', () => {
      applyPalette('prodigy');
      expect(document.documentElement.getAttribute('data-palette')).toBe('prodigy');
      expect(useSettingsStore.getState().palette).toBe('prodigy');
    });

    it('applies both theme and palette in a single call', () => {
      applyThemePalette('prodigy', 'light');
      expect(document.documentElement.getAttribute('data-palette')).toBe('prodigy');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(useSettingsStore.getState().palette).toBe('prodigy');
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('applies amoled theme mode via applyTheme and applyThemePalette', () => {
      applyTheme('amoled');
      expect(document.documentElement.getAttribute('data-theme')).toBe('amoled');
      expect(useSettingsStore.getState().theme).toBe('amoled');

      applyThemePalette('prodigy', 'amoled');
      expect(document.documentElement.getAttribute('data-theme')).toBe('amoled');
      expect(useSettingsStore.getState().theme).toBe('amoled');
    });
  });

  describe('Browser Chrome theme-color Meta Synchronisation', () => {
    it('defines initial theme-color meta tag in index.html matching dark chassis', () => {
      const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
      expect(indexHtml).toMatch(/<meta\s+name=["']theme-color["']\s+content=["']#050b0d["']\s*\/?>/);
    });

    it('resolves canonical browser chrome hex colours for dark, light, and amoled themes', () => {
      expect(resolveThemeBrowserColor('dark')).toBe('#050b0d');
      expect(resolveThemeBrowserColor('light')).toBe('#f2f7f7');
      expect(resolveThemeBrowserColor('amoled')).toBe('#000000');
    });

    it('creates and updates meta[name="theme-color"] across theme switches', () => {
      syncThemeColorMeta('dark');
      const created = document.querySelector('meta[name="theme-color"]');
      expect(created).not.toBeNull();
      expect(created?.getAttribute('content')).toBe('#050b0d');

      syncThemeColorMeta('light');
      expect(headChildren).toHaveLength(1);
      expect(created?.getAttribute('content')).toBe('#f2f7f7');

      syncThemeColorMeta('amoled');
      expect(headChildren).toHaveLength(1);
      expect(created?.getAttribute('content')).toBe('#000000');
    });

    it('synchronises meta[name="theme-color"] when applyTheme or applyThemePalette is called', () => {
      applyTheme('light');
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f2f7f7');

      applyThemePalette('prodigy', 'amoled');
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#000000');

      applyTheme('dark');
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#050b0d');
    });
  });
});
