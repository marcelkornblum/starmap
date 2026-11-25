import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { useSettingsStore } from '../../stores/useSettingsStore';
import {
  THEME_PALETTES,
  applyTheme,
  applyPalette,
  applyThemePalette,
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

const originalDocument = globalThis.document;

describe('Theme & Palette Management (paletteTheme)', () => {
  beforeEach(() => {
    mockAttrs.clear();
    (globalThis as unknown as { document: unknown }).document = {
      documentElement: mockDocumentElement,
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
  });
});
