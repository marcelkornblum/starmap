import type { CelestialSymbolType } from '../../types/astro';

export type LegendLineKind =
  | 'confirmed-orbit'
  | 'theoretical-orbit'
  | 'kinematic-highlight'
  | 'datum-plane'
  | 'route-chord';

export interface LegendLineEntry {
  readonly id: LegendLineKind;
  readonly title: string;
  readonly patternLabel: string;
  readonly tokenRef: string;
  readonly description: string;
}

export const LEGEND_LINE_ENTRIES: readonly LegendLineEntry[] = [
  {
    id: 'confirmed-orbit',
    title: 'Confirmed Keplerian Orbit',
    patternLabel: 'Dashed hairline (6px dash / 4px gap)',
    tokenRef: '--chrome-orbit-color',
    description:
      'Bound elliptical orbit with a catalogued semi-major axis (a > 0, e < 1) rendered consistently across the 3D canvas and Orbiting Bodies.',
  },
  {
    id: 'theoretical-orbit',
    title: 'Theoretical / Inferred Orbit & Hyperbolic Trajectory',
    patternLabel: 'Dotted hairline (2px dot / 4px gap)',
    tokenRef: '--chrome-orbit-color',
    description:
      'Inferred orbital radius (uncatalogued semi-major axis) or unbound hyperbolic trajectory (e >= 1), including interstellar visitors and escape probes.',
  },
  {
    id: 'kinematic-highlight',
    title: 'Focused, Selected & Hovered Track',
    patternLabel: 'Dashed / dotted kinematic highlight',
    tokenRef: '--chrome-kinematic-color',
    description:
      'Active interactive highlight synchronised between the 3D canvas and HUD panels.',
  },
  {
    id: 'datum-plane',
    title: 'Datum Planes & Drop Stalks',
    patternLabel: 'Solid hairline (1px)',
    tokenRef: '--chrome-datum-plane-color',
    description:
      'Galactic equator and ecliptic reference planes paired with vertical elevation drop stalks.',
  },
  {
    id: 'route-chord',
    title: 'Journey Route Chord',
    patternLabel: 'Solid vector chord (3px)',
    tokenRef: '--chrome-route-color',
    description:
      'Kinematic transit vector connecting planned navigation waypoints.',
  },
];

export type LegendRegionKind = 'belt' | 'ring-system' | 'habitable-zone';

export interface LegendZoneEntry {
  readonly id: string;
  readonly regionKind: LegendRegionKind;
  readonly title: string;
  readonly tokenRef: string;
  readonly description: string;
}

export const LEGEND_ZONE_ENTRIES: readonly LegendZoneEntry[] = [
  {
    id: 'belt-debris',
    regionKind: 'belt',
    title: 'Asteroid Belts & Debris Disks',
    tokenRef: '--status-caution / --content-default',
    description:
      'Diagonal cross-hatched particulate wash framed by dashed radial bounds for asteroid, Kuiper, and debris zones; resident bodies render inside a unified zone band.',
  },
  {
    id: 'ring-system',
    regionKind: 'ring-system',
    title: 'Planetary Ring Systems',
    tokenRef: '--status-info',
    description:
      "Horizontal concentric ringlet bands framed by solid radial bounds distinguishing planetary ring systems (such as Saturn's Main Rings and E Ring) from diffuse circumstellar belts.",
  },
  {
    id: 'habitable-zone',
    regionKind: 'habitable-zone',
    title: 'Circumstellar Habitable Zone',
    tokenRef: '--category-habitability',
    description:
      "Left-margin vertical rail with feathered ends tapering smoothly to transparent, reflecting Kopparapu's conservative core and optimistic boundaries.",
  },
];

export interface LegendSymbolGroup {
  readonly id: string;
  readonly title: string;
  readonly types: readonly CelestialSymbolType[];
}

export const LEGEND_SYMBOL_GROUPS: readonly LegendSymbolGroup[] = [
  {
    id: 'stellar-compact-remnants',
    title: 'Stellar & Compact Remnants',
    types: [
      'star',
      'stellar-system',
      'multiple-system',
      'brown-dwarf',
      'white-dwarf',
      'neutron-star',
      'pulsar',
      'black-hole',
      'barycentre',
      'stellar-cluster',
    ],
  },
  {
    id: 'planetary-subplanetary',
    title: 'Planetary & Sub-Planetary Bodies',
    types: [
      'terrestrial',
      'super-earth',
      'gas-giant',
      'ice-giant',
      'dwarf-planet',
      'moon',
    ],
  },
  {
    id: 'minor-bodies-zones-constructs',
    title: 'Minor Bodies, Zones & Artificial Constructs',
    types: [
      'asteroid',
      'comet',
      'belt',
      'asteroid-belt',
      'kuiper-belt',
      'debris-disk',
      'oort-cloud',
      'construct',
      'spacecraft',
      'habitable-zone',
    ],
  },
  {
    id: 'interstellar-medium-hazards',
    title: 'Interstellar Medium & Hazards',
    types: [
      'nebula',
      'ism',
      'supernova-remnant',
      'hazard',
    ],
  },
];

export type LegendSwatchKind =
  | 'focus'
  | 'selected'
  | 'kinematic'
  | 'habitability'
  | 'caution'
  | 'critical'
  | 'confirmed'
  | 'candidate'
  | 'theoretical';

export interface LegendChromaticEntry {
  readonly id: string;
  readonly swatchKind: LegendSwatchKind;
  readonly title: string;
  readonly tokenRef: string;
  readonly description: string;
}

export const LEGEND_CHROMATIC_ENTRIES: readonly LegendChromaticEntry[] = [
  {
    id: 'state-focus',
    swatchKind: 'focus',
    title: 'Focused Target & Primary Accent',
    tokenRef: '--state-focus',
    description:
      'Denotes the actively focused entity, keyboard focus rings, and primary navigation cues.',
  },
  {
    id: 'state-selected',
    swatchKind: 'selected',
    title: 'Selected Entity',
    tokenRef: '--state-selected',
    description:
      'Marks explicitly selected targets across the 3D reticle, schematic tracks, and inspection panels.',
  },
  {
    id: 'chrome-kinematic',
    swatchKind: 'kinematic',
    title: 'Kinematic Highlight',
    tokenRef: '--chrome-kinematic-color',
    description:
      'Highlights hovered or focused orbital tracks, bearing lines, and planned transit vectors.',
  },
  {
    id: 'category-habitability',
    swatchKind: 'habitability',
    title: 'Habitable Zone & Temperate Margin',
    tokenRef: '--category-habitability',
    description:
      'Marks circumstellar habitable zone rails and temperate candidate conditions.',
  },
  {
    id: 'status-caution',
    swatchKind: 'caution',
    title: 'Operational Warning',
    tokenRef: '--status-caution',
    description:
      'Flags non-lethal operational hazards such as stellar flares, tidal locking, or elevated gravity.',
  },
  {
    id: 'status-critical',
    swatchKind: 'critical',
    title: 'Critical Hazard',
    tokenRef: '--status-critical',
    description:
      'Flags extreme thermal regimes, intense ionising radiation, and relativistic hazards.',
  },
  {
    id: 'confidence-confirmed',
    swatchKind: 'confirmed',
    title: 'Confirmed Observation',
    tokenRef: '--confidence-confirmed',
    description:
      'Parameters directly confirmed in catalogued astrometric or spectroscopic observations.',
  },
  {
    id: 'confidence-candidate',
    swatchKind: 'candidate',
    title: 'Candidate Observation',
    tokenRef: '--confidence-candidate',
    description:
      'Unconfirmed candidate detections awaiting follow-up validation.',
  },
  {
    id: 'confidence-theoretical',
    swatchKind: 'theoretical',
    title: 'Theoretical / Projected',
    tokenRef: '--confidence-theoretical',
    description:
      'Model-inferred or projected physical and orbital parameters.',
  },
];

export const LEGEND_SPECTRAL_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'L', 'D'] as const;

export const LEGEND_CONFIDENCE_LEVELS = ['confirmed', 'candidate', 'theoretical'] as const;
