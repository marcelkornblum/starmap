import type { CelestialClassification } from '../components/poc/canvas/cartography/reticleGeometry';

/**
 * Surface colour and texture manifest for procedural planetary bodies.
 * Extracted from component rendering code to maintain strict data-rendering separation.
 */
export interface PlanetPalette {
  baseColor: string;
  accentColor: string;
  atmosphereColor?: string;
  bands?: string[];
  spotColor?: string;
}

export const CLASSIFICATION_PALETTES: Record<string, PlanetPalette> = {
  terrestrial: {
    baseColor: '#1c4d7d',
    accentColor: '#3c7a52',
    atmosphereColor: '#68b4e8',
  },
  'gas-giant': {
    baseColor: '#c88c52',
    accentColor: '#e0c088',
    atmosphereColor: '#d6a066',
    bands: ['#a86832', '#dca870', '#884c20', '#f0cca0', '#9c5c2c'],
    spotColor: '#b04020',
  },
  'ice-giant': {
    baseColor: '#3288a8',
    accentColor: '#62c2d8',
    atmosphereColor: '#88e4f8',
    bands: ['#287090', '#3c98b8', '#226080', '#50b4d4'],
  },
  'brown-dwarf': {
    baseColor: '#4a2218',
    accentColor: '#803422',
    atmosphereColor: '#682a1c',
    bands: ['#381a14', '#5c281e', '#2e140e'],
  },
  star: {
    baseColor: '#ffcc33',
    accentColor: '#ff9900',
    atmosphereColor: '#ffea88',
  },
};

export const DEFAULT_PLANET_PALETTE: PlanetPalette = {
  baseColor: '#4a607a',
  accentColor: '#708ca8',
  atmosphereColor: '#90b0d0',
};

export function getClassificationPalette(classification: CelestialClassification): PlanetPalette {
  return CLASSIFICATION_PALETTES[classification] ?? DEFAULT_PLANET_PALETTE;
}
