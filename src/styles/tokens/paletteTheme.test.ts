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
  style: {
    colorScheme: '',
  },
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
    mockDocumentElement.style.colorScheme = '';
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
      querySelectorAll: (selector: string) => {
        if (selector === 'meta[name="theme-color"]') {
          return headChildren.filter((el) => el.getAttribute('name') === 'theme-color');
        }
        return [];
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
    it('defines color-scheme, media-qualified theme-color meta tags, and manifest link in index.html', () => {
      const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
      const colorSchemeMatch = indexHtml.match(/<meta\s+name=["']color-scheme["']\s+content=["']dark light["']\s*\/?>/);
      const darkThemeMatch = indexHtml.match(
        /<meta\s+name=["']theme-color["']\s+media=["']\(prefers-color-scheme:\s*dark\)["']\s+content=["']#050b0d["']\s*\/?>/,
      );
      const lightThemeMatch = indexHtml.match(
        /<meta\s+name=["']theme-color["']\s+media=["']\(prefers-color-scheme:\s*light\)["']\s+content=["']#050b0d["']\s*\/?>/,
      );
      const fallbackThemeMatch = indexHtml.match(/<meta\s+name=["']theme-color["']\s+content=["']#050b0d["']\s*\/?>/);
      const manifestMatch = indexHtml.match(/<link\s+rel=["']manifest["']\s+href=["']%BASE_URL%manifest\.webmanifest["']\s*\/?>/);

      expect(colorSchemeMatch).not.toBeNull();
      expect(darkThemeMatch).not.toBeNull();
      expect(lightThemeMatch).not.toBeNull();
      expect(fallbackThemeMatch).not.toBeNull();
      expect(manifestMatch).not.toBeNull();
      expect(colorSchemeMatch!.index!).toBeLessThan(darkThemeMatch!.index!);
      expect(colorSchemeMatch!.index!).toBeLessThan(fallbackThemeMatch!.index!);
    });

    it('provides valid public/manifest.webmanifest matching dark chassis chrome', () => {
      const manifestRaw = fs.readFileSync(path.resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8');
      const manifest = JSON.parse(manifestRaw) as {
        name: string;
        short_name: string;
        start_url: string;
        display: string;
        background_color: string;
        theme_color: string;
        icons: Array<{ src: string; sizes: string; type: string }>;
      };

      expect(manifest).toEqual({
        name: 'Starmap',
        short_name: 'Starmap',
        start_url: '.',
        display: 'standalone',
        background_color: '#050b0d',
        theme_color: '#050b0d',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      });
    });

    it('resolves canonical browser chrome hex colours for dark, light, and amoled themes', () => {
      expect(resolveThemeBrowserColor('dark')).toBe('#050b0d');
      expect(resolveThemeBrowserColor('light')).toBe('#f2f7f7');
      expect(resolveThemeBrowserColor('amoled')).toBe('#000000');
    });

    it('creates and updates all meta[name="theme-color"] tags and documentElement.style.colorScheme across theme switches', () => {
      syncThemeColorMeta('dark');
      const created = document.querySelector('meta[name="theme-color"]');
      expect(created).not.toBeNull();
      expect(created?.getAttribute('content')).toBe('#050b0d');
      expect(document.documentElement.style.colorScheme).toBe('dark');

      const extraMediaDark = createMockMetaElement();
      extraMediaDark.setAttribute('name', 'theme-color');
      extraMediaDark.setAttribute('media', '(prefers-color-scheme: dark)');
      document.head.appendChild(extraMediaDark as unknown as Node);

      const extraMediaLight = createMockMetaElement();
      extraMediaLight.setAttribute('name', 'theme-color');
      extraMediaLight.setAttribute('media', '(prefers-color-scheme: light)');
      document.head.appendChild(extraMediaLight as unknown as Node);

      syncThemeColorMeta('light');
      expect(headChildren).toHaveLength(3);
      expect(headChildren.every((el) => el.getAttribute('content') === '#f2f7f7')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('light');

      syncThemeColorMeta('amoled');
      expect(headChildren).toHaveLength(3);
      expect(headChildren.every((el) => el.getAttribute('content') === '#000000')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('synchronises meta[name="theme-color"] when applyTheme or applyThemePalette is called', () => {
      applyTheme('light');
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f2f7f7');
      expect(document.documentElement.style.colorScheme).toBe('light');

      applyThemePalette('prodigy', 'amoled');
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#000000');
      expect(document.documentElement.style.colorScheme).toBe('dark');

      applyTheme('dark');
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#050b0d');
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });
  });

  describe('Phase 1 Prodigy Visual Richness Token Contracts', () => {
    const semanticCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens/semantic.css'), 'utf8');
    const palettesCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens/palettes.css'), 'utf8');
    const fullAssemblyCss = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/canvas/FullAssembly.module.css'),
      'utf8',
    );
    const storybookWrapperCss = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/canvas/cartography/StorybookCanvasWrapper.module.css'),
      'utf8',
    );
    const entityLabelCss = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/canvas/entity/EntityLabel.module.css'),
      'utf8',
    );

    function extractBlock(css: string, selectorPattern: RegExp): string {
      const match = selectorPattern.exec(css);
      if (!match || match.index === undefined) return '';
      const openIdx = css.indexOf('{', match.index);
      if (openIdx === -1) return '';
      let depth = 0;
      for (let i = openIdx; i < css.length; i++) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') {
          depth--;
          if (depth === 0) return css.slice(openIdx + 1, i);
        }
      }
      return '';
    }

    function readProp(block: string, prop: string): string | null {
      const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escaped}\\s*:\\s*([^;]+);`);
      const match = regex.exec(block);
      return match?.[1]?.trim().replace(/\s+/g, ' ') ?? null;
    }

    const darkBlock = extractBlock(semanticCss, /:root,\s*\[data-theme="dark"\]\s*\{/);
    const lightBlock = extractBlock(semanticCss, /\[data-theme="light"\]\s*\{/);
    const amoledBlock = extractBlock(semanticCss, /\[data-theme="amoled"\]\s*\{/);
    const tier1DarkBlock = extractBlock(semanticCss, /:root\[data-device-tier="tier1"\],\s*\[data-theme="dark"\]\[data-device-tier="tier1"\]\s*\{/);
    const tier1LightBlock = extractBlock(semanticCss, /\[data-theme="light"\]\[data-device-tier="tier1"\]\s*\{/);
    const tier1AmoledBlock = extractBlock(semanticCss, /\[data-theme="amoled"\]\[data-device-tier="tier1"\]\s*\{/);

    it('binds --surface-panel-bg to directional slab gradients and defines [data-theme="amoled"]', () => {
      expect(palettesCss).toContain('--gradient-control-primary-dark:');
      expect(palettesCss).toContain('--gradient-control-primary-light:');
      expect(palettesCss).toContain('--bevel-control-primary-dark:');
      expect(palettesCss).toContain('--bevel-control-primary-light:');

      expect(readProp(darkBlock, '--surface-panel-bg')).toBe('var(--gradient-surface-slab-dark)');
      expect(readProp(lightBlock, '--surface-panel-bg')).toBe('var(--gradient-surface-slab-light)');
      expect(amoledBlock).not.toBe('');
      expect(readProp(amoledBlock, '--surface-canvas-bg')).toBe('oklch(0% 0 0)');
      expect(readProp(amoledBlock, '--surface-canvas-stage-bg')).toContain('radial-gradient(');
      expect(readProp(amoledBlock, '--surface-panel-bg')).toContain('linear-gradient(');

      expect(fullAssemblyCss).toContain('background: var(--surface-panel-bg);');
      expect(fullAssemblyCss).not.toContain('background-color: var(--surface-panel-bg);');
      expect(storybookWrapperCss).toContain('background: var(--surface-panel-bg);');
      expect(storybookWrapperCss).not.toContain('background-color: var(--surface-panel-bg);');
    });

    it('separates Bio-Jade --status-nominal (hue 164) from --status-neutral (hue 198) and keeps unselected node labels neutral', () => {
      expect(readProp(darkBlock, '--status-nominal')).toBe('oklch(78.0% 0.135 164)');
      expect(readProp(darkBlock, '--status-neutral')).toBe('var(--palette-accent-neutral)');
      expect(readProp(darkBlock, '--status-neutral-surface')).toContain('198');
      expect(readProp(darkBlock, '--status-neutral-border')).toContain('198');

      expect(readProp(lightBlock, '--status-nominal')).toBe('oklch(48.0% 0.140 164)');
      expect(readProp(lightBlock, '--status-neutral')).toBe('oklch(46.0% 0.045 198)');
      expect(readProp(lightBlock, '--status-neutral-surface')).toContain('198');
      expect(readProp(lightBlock, '--status-neutral-border')).toContain('198');

      expect(readProp(darkBlock, '--chrome-node-label-color')).toBe('var(--status-neutral)');
      expect(readProp(darkBlock, '--chrome-node-facet-separator-color')).toBe('var(--status-neutral)');
      expect(readProp(lightBlock, '--chrome-node-label-color')).toBe('var(--status-neutral)');
      expect(readProp(lightBlock, '--chrome-node-facet-separator-color')).toBe('var(--status-neutral)');

      expect(entityLabelCss).not.toContain('var(--status-nominal)');
      expect(entityLabelCss).toContain('var(--status-neutral)');
    });

    it('narrows tier1 low-GPU guard to disable blur while preserving directional gradient panel bg and stage bg', () => {
      expect(readProp(tier1DarkBlock, '--surface-panel-backdrop-filter')).toBe('none');
      expect(readProp(tier1DarkBlock, '--surface-panel-bg')).toBe('var(--gradient-surface-chassis-dark)');
      expect(readProp(tier1DarkBlock, '--surface-panel-shadow')).toBe('var(--bevel-top-rim-subtle)');
      expect(readProp(tier1DarkBlock, '--surface-canvas-stage-bg')).toBeNull();

      expect(readProp(tier1LightBlock, '--surface-panel-backdrop-filter')).toBe('none');
      expect(readProp(tier1LightBlock, '--surface-panel-bg')).toBe('var(--gradient-surface-chassis-light)');
      expect(readProp(tier1LightBlock, '--surface-panel-shadow')).toBe('var(--bevel-top-rim-light)');
      expect(readProp(tier1LightBlock, '--surface-canvas-stage-bg')).toBeNull();

      expect(tier1AmoledBlock).not.toBe('');
      expect(readProp(tier1AmoledBlock, '--surface-panel-backdrop-filter')).toBe('none');
      expect(readProp(tier1AmoledBlock, '--surface-panel-bg')).toContain('linear-gradient(');
      expect(readProp(tier1AmoledBlock, '--surface-canvas-stage-bg')).toBeNull();
    });

    it('avoids oklch(from ...) relative syntax in every color token read by extractThreeColorTokens', () => {
      const threeColorTokens = [
        '--surface-canvas-bg',
        '--chrome-grid-primary-color',
        '--chrome-grid-secondary-color',
        '--chrome-range-ring-color',
        '--chrome-range-tick-color',
        '--chrome-datum-plane-color',
        '--chrome-datum-plane-major-color',
        '--chrome-datum-plane-minor-color',
        '--chrome-datum-plane-fill-color',
        '--chrome-datum-footprint-color',
        '--chrome-reticle-bracket-color',
        '--chrome-boresight-color',
        '--chrome-axis-line-color',
        '--chrome-bearing-line-color',
        '--chrome-bearing-orbital-color',
        '--chrome-bearing-core-color',
        '--chrome-heading-indicator-color',
        '--chrome-kinematic-color',
        '--chrome-stalk-selected-color',
        '--chrome-stalk-focused-color',
        '--chrome-footprint-color',
        '--chrome-footprint-selected-color',
        '--chrome-footprint-focused-color',
        '--chrome-orbit-color',
        '--chrome-orbit-selected-color',
        '--chrome-orbit-focused-color',
        '--chrome-route-color',
        '--state-focus',
        '--state-selected',
        '--state-selected-border',
        '--category-star',
        '--category-planet',
        '--category-orbit',
        '--category-habitability',
        '--status-nominal',
        '--status-caution',
        '--status-critical',
        '--confidence-confirmed',
        '--confidence-candidate',
        '--confidence-theoretical',
      ];

      for (const block of [darkBlock, lightBlock, amoledBlock]) {
        for (const token of threeColorTokens) {
          const val = readProp(block, token);
          if (val !== null) {
            expect(val, `${token} must not use oklch(from ...)`).not.toContain('oklch(from');
          }
        }
      }
    });
  });
});
