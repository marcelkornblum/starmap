import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import {
  THEME_PALETTES,
  applyTheme,
  applyPalette,
  applyThemePalette,
} from '../src/styles/tokens/paletteTheme';
import { ThemeSwitcher } from '../src/components/domain/ThemeSwitcher/ThemeSwitcher';

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

describe('Theme & Palette Management', () => {
  beforeEach(() => {
    mockAttrs.clear();
    (globalThis as unknown as { document: unknown }).document = {
      documentElement: mockDocumentElement,
    };
    useSettingsStore.getState().resetSettings();
  });

  afterAll(() => {
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  describe('Literal Token Palette Definitions', () => {
    it('defines 4 canonical palettes with correct hue angles and metadata', () => {
      expect(THEME_PALETTES.kepler.surfaceHue).toBe(198);
      expect(THEME_PALETTES.kepler.focusHue).toBe(156);

      expect(THEME_PALETTES.cygnus.surfaceHue).toBe(238);
      expect(THEME_PALETTES.cygnus.focusHue).toBe(58);

      expect(THEME_PALETTES.carbon.surfaceHue).toBe(0);
      expect(THEME_PALETTES.carbon.focusHue).toBe(195);

      expect(THEME_PALETTES.obsidian.surfaceHue).toBe(255);
      expect(THEME_PALETTES.obsidian.focusHue).toBe(262);
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
      applyPalette('cygnus');
      expect(document.documentElement.getAttribute('data-palette')).toBe('cygnus');
      expect(useSettingsStore.getState().palette).toBe('cygnus');

      applyPalette('carbon');
      expect(document.documentElement.getAttribute('data-palette')).toBe('carbon');
      expect(useSettingsStore.getState().palette).toBe('carbon');

      applyPalette('obsidian');
      expect(document.documentElement.getAttribute('data-palette')).toBe('obsidian');
      expect(useSettingsStore.getState().palette).toBe('obsidian');

      applyPalette('kepler');
      expect(document.documentElement.getAttribute('data-palette')).toBe('kepler');
      expect(useSettingsStore.getState().palette).toBe('kepler');
    });

    it('applies both theme and palette in a single call', () => {
      applyThemePalette('obsidian', 'light');
      expect(document.documentElement.getAttribute('data-palette')).toBe('obsidian');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(useSettingsStore.getState().palette).toBe('obsidian');
      expect(useSettingsStore.getState().theme).toBe('light');
    });
  });

  describe('ThemeSwitcher Widget Component', () => {
    it('renders mode switcher and all 4 palette options', () => {
      const html = renderToString(createElement(ThemeSwitcher));

      expect(html).toContain('DARK');
      expect(html).toContain('LIGHT');
      expect(html).toContain('Kepler');
      expect(html).toContain('Cygnus');
      expect(html).toContain('Carbon');
      expect(html).toContain('Obsidian');
      expect(html).toContain('data-testid="theme-palette-switcher"');
    });

    it('renders in compact mode with role attributes', () => {
      const html = renderToString(createElement(ThemeSwitcher, { compact: true }));

      expect(html).toContain('role="group"');
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('Kepler');
      expect(html).toContain('Cygnus');
      expect(html).toContain('Carbon');
      expect(html).toContain('Obsidian');
    });
  });
});
