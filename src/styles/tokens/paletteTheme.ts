import { useSettingsStore, type ThemePalette, type UITheme } from '../../stores/useSettingsStore';

export type { ThemePalette, UITheme };
export type ThemeMode = 'dark' | 'light';

export interface PaletteDefinition {
  id: ThemePalette;
  label: string;
  tagline: string;
  surfaceHue: number;
  focusHue: number;
  accentColorDark: string;
  accentColorLight: string;
  surfaceColorDark: string;
  surfaceColorLight: string;
}

export const THEME_PALETTES: Record<ThemePalette, PaletteDefinition> = {
  prodigy: {
    id: 'prodigy',
    label: 'Prodigy',
    tagline: 'Abyssal Verdigris / Phosphor Bio-Jade',
    surfaceHue: 198,
    focusHue: 166,
    accentColorDark: 'oklch(81.5% 0.148 166)',
    accentColorLight: 'oklch(46.0% 0.140 166)',
    surfaceColorDark: 'oklch(10.5% 0.024 198)',
    surfaceColorLight: 'oklch(97.2% 0.008 198)',
  },
};

export const PALETTE_LIST = Object.values(THEME_PALETTES);

const THEME_BROWSER_CHROME_COLORS: Record<UITheme, string> = {
  dark: '#ff00aa',
  light: '#f2f7f7',
  amoled: '#000000',
};

/**
 * Resolves the canonical hex colour for `<meta name="theme-color">` from the active UI theme.
 */
export function resolveThemeBrowserColor(theme: UITheme): string {
  return THEME_BROWSER_CHROME_COLORS[theme] ?? THEME_BROWSER_CHROME_COLORS.dark;
}

/**
 * Synchronises all `<meta name="theme-color">` tags in `document.head` (creating one if absent)
 * and `document.documentElement.style.colorScheme` so mobile browser chrome matches the active Starmap theme.
 */
export function syncThemeColorMeta(theme: UITheme): void {
  if (typeof document === 'undefined') return;
  const color = resolveThemeBrowserColor(theme);
  const existing =
    typeof document.querySelectorAll === 'function'
      ? Array.from(document.querySelectorAll('meta[name="theme-color"]'))
      : typeof document.querySelector === 'function'
        ? [document.querySelector('meta[name="theme-color"]')].filter((el): el is Element => el !== null)
        : [];
  if (existing.length > 0) {
    for (const meta of existing) {
      meta.setAttribute('content', color);
    }
  } else if (typeof document.createElement === 'function' && document.head) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', color);
    document.head.appendChild(meta);
  }
  if (document.documentElement?.style) {
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }
}

/**
 * Clean literal tokens hue and theme swap function.
 * Synchronises DOM attributes with the authoritative store.
 */
export function applyTheme(mode: UITheme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);
    syncThemeColorMeta(mode);
  }
  useSettingsStore.getState().setTheme(mode);
}

export function applyPalette(palette: ThemePalette): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-palette', palette);
  }
  useSettingsStore.getState().setPalette(palette);
}

export function applyThemePalette(palette: ThemePalette, mode: UITheme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-palette', palette);
    document.documentElement.setAttribute('data-theme', mode);
    syncThemeColorMeta(mode);
  }
  const store = useSettingsStore.getState();
  store.setTheme(mode);
  store.setPalette(palette);
}
