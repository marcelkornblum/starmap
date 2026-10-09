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
  kepler: {
    id: 'kepler',
    label: 'Kepler',
    tagline: 'Titanium Slate / Neodymium Emerald',
    surfaceHue: 198,
    focusHue: 156,
    accentColorDark: 'oklch(75.0% 0.190 156)',
    accentColorLight: 'oklch(45.0% 0.175 156)',
    surfaceColorDark: 'oklch(6.8% 0.022 198)',
    surfaceColorLight: 'oklch(96.8% 0.010 198)',
  },
  cygnus: {
    id: 'cygnus',
    label: 'Cygnus',
    tagline: 'Midnight Navy / Pulsar Amber',
    surfaceHue: 238,
    focusHue: 58,
    accentColorDark: 'oklch(74.0% 0.188 58)',
    accentColorLight: 'oklch(48.0% 0.185 52)',
    surfaceColorDark: 'oklch(6.8% 0.040 238)',
    surfaceColorLight: 'oklch(96.5% 0.012 238)',
  },
  carbon: {
    id: 'carbon',
    label: 'Carbon',
    tagline: 'Achromatic Carbon / Laser Cyan',
    surfaceHue: 0,
    focusHue: 195,
    accentColorDark: 'oklch(78.0% 0.172 195)',
    accentColorLight: 'oklch(44.0% 0.160 195)',
    surfaceColorDark: 'oklch(5.5% 0.000 0)',
    surfaceColorLight: 'oklch(97.0% 0.000 0)',
  },
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian',
    tagline: 'Celestial Indigo / Ion Cobalt',
    surfaceHue: 255,
    focusHue: 262,
    accentColorDark: 'oklch(65.0% 0.235 262)',
    accentColorLight: 'oklch(50.0% 0.230 262)',
    surfaceColorDark: 'oklch(6.5% 0.020 255)',
    surfaceColorLight: 'oklch(96.5% 0.008 255)',
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
