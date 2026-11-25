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

/**
 * Clean literal tokens hue and theme swap function.
 * Synchronises DOM attributes with the authoritative store.
 */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);
  }
  useSettingsStore.getState().setTheme(mode);
}

export function applyPalette(palette: ThemePalette): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-palette', palette);
  }
  useSettingsStore.getState().setPalette(palette);
}

export function applyThemePalette(palette: ThemePalette, mode: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-palette', palette);
    document.documentElement.setAttribute('data-theme', mode);
  }
  const store = useSettingsStore.getState();
  store.setTheme(mode);
  store.setPalette(palette);
}
