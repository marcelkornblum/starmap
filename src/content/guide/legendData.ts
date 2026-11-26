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
  readonly roleLabel: string;
  readonly description: string;
}

export const LEGEND_LINE_ENTRIES: readonly LegendLineEntry[] = [
  {
    id: 'confirmed-orbit',
    title: 'Confirmed Keplerian Orbit',
    patternLabel: 'Dashed hairline',
    roleLabel: 'Catalogued Keplerian track',
    description:
      'Bound elliptical orbit with a catalogued semi-major axis (a > 0, e < 1) rendered consistently across the 3D canvas and Orbiting Bodies.',
  },
  {
    id: 'theoretical-orbit',
    title: 'Theoretical / Inferred Orbit & Hyperbolic Trajectory',
    patternLabel: 'Dotted hairline',
    roleLabel: 'Inferred or hyperbolic track',
    description:
      'Inferred orbital radius (uncatalogued semi-major axis) or unbound hyperbolic trajectory (e >= 1), including interstellar visitors and escape probes.',
  },
  {
    id: 'kinematic-highlight',
    title: 'Focused, Selected & Hovered Track',
    patternLabel: 'Recoloured track',
    roleLabel: 'Kinematic highlight stroke',
    description:
      'Active interactive highlight synchronised between the 3D canvas and HUD panels.',
  },
  {
    id: 'datum-plane',
    title: 'Datum Planes & Drop Stalks',
    patternLabel: 'Solid hairline',
    roleLabel: 'Reference plane & elevation stalk',
    description:
      'Galactic equator and ecliptic reference planes paired with vertical elevation drop stalks.',
  },
  {
    id: 'route-chord',
    title: 'Journey Route Chord',
    patternLabel: 'Solid vector chord',
    roleLabel: 'Planned navigation vector',
    description:
      'Kinematic transit vector connecting planned navigation waypoints.',
  },
];

export type LegendRegionKind = 'belt' | 'ring-system' | 'habitable-zone';

export interface LegendZoneEntry {
  readonly id: string;
  readonly regionKind: LegendRegionKind;
  readonly title: string;
  readonly roleLabel: string;
  readonly description: string;
}

export const LEGEND_ZONE_ENTRIES: readonly LegendZoneEntry[] = [
  {
    id: 'belt-debris',
    regionKind: 'belt',
    title: 'Asteroid Belts & Debris Disks',
    roleLabel: 'Diagonal hatched amber band',
    description:
      'Single-diagonal hatched particulate wash framed by dashed radial bounds for asteroid, Kuiper, and debris zones; resident bodies render inside a unified zone band.',
  },
  {
    id: 'ring-system',
    regionKind: 'ring-system',
    title: 'Planetary Ring Systems',
    roleLabel: 'Horizontal cyan ringlet band',
    description:
      "Fine horizontal concentric ringlet hairlines framed by solid radial bounds distinguishing planetary ring systems (such as Saturn's Main Rings and E Ring) from diffuse circumstellar belts.",
  },
  {
    id: 'habitable-zone',
    regionKind: 'habitable-zone',
    title: 'Circumstellar Habitable Zone',
    roleLabel: 'Feathered left-margin habitability rail',
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
      'kuiper-belt-object',
      'debris-disk',
      'oort-cloud',
      'construct',
      'spacecraft',
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
  readonly roleLabel: string;
  readonly description: string;
}

export const LEGEND_CHROMATIC_ENTRIES: readonly LegendChromaticEntry[] = [
  {
    id: 'state-focus',
    swatchKind: 'focus',
    title: 'Focused Target & Primary Accent',
    roleLabel: 'Primary interactive focus',
    description:
      'Denotes the actively focused entity, keyboard focus rings, and primary navigation cues.',
  },
  {
    id: 'state-selected',
    swatchKind: 'selected',
    title: 'Selected Entity',
    roleLabel: 'Active target selection',
    description:
      'Marks explicitly selected targets across the 3D reticle, schematic tracks, and inspection panels.',
  },
  {
    id: 'chrome-kinematic',
    swatchKind: 'kinematic',
    title: 'Kinematic Highlight',
    roleLabel: 'Hovered & active track highlight',
    description:
      'Highlights hovered or focused orbital tracks, bearing lines, and planned transit vectors.',
  },
  {
    id: 'category-habitability',
    swatchKind: 'habitability',
    title: 'Habitable Zone & Temperate Margin',
    roleLabel: 'Temperate habitable margin',
    description:
      'Marks circumstellar habitable zone rails and temperate candidate conditions.',
  },
  {
    id: 'status-caution',
    swatchKind: 'caution',
    title: 'Operational Warning',
    roleLabel: 'Operational hazard warning',
    description:
      'Flags non-lethal operational hazards such as stellar flares, tidal locking, or elevated gravity.',
  },
  {
    id: 'status-critical',
    swatchKind: 'critical',
    title: 'Critical Hazard',
    roleLabel: 'Critical astrophysical hazard',
    description:
      'Flags extreme thermal regimes, intense ionising radiation, and relativistic hazards.',
  },
  {
    id: 'confidence-confirmed',
    swatchKind: 'confirmed',
    title: 'Confirmed Observation',
    roleLabel: 'Confirmed catalogued datum',
    description:
      'Parameters directly confirmed in catalogued astrometric or spectroscopic observations.',
  },
  {
    id: 'confidence-candidate',
    swatchKind: 'candidate',
    title: 'Candidate Observation',
    roleLabel: 'Candidate detection',
    description:
      'Unconfirmed candidate detections awaiting follow-up validation.',
  },
  {
    id: 'confidence-theoretical',
    swatchKind: 'theoretical',
    title: 'Theoretical / Projected',
    roleLabel: 'Model-inferred or projected datum',
    description:
      'Model-inferred or projected physical and orbital parameters.',
  },
];

export const LEGEND_SPECTRAL_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'L/T/Y', 'D'] as const;

export const LEGEND_CONFIDENCE_LEVELS = ['confirmed', 'candidate', 'theoretical'] as const;
