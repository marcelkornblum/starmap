import type { BadgeCategory, BadgeStatus } from '../Badge/Badge';
import type { CelestialSymbolType } from '../../../../types/astro';

export type { CelestialSymbolType };

export interface CelestialSymbolMetadata {
  readonly type: CelestialSymbolType;
  readonly label: string;
  readonly badgeCategory?: BadgeCategory;
  readonly badgeStatus?: BadgeStatus;
  readonly defaultGuideHref?: string;
}

export const CELESTIAL_SYMBOL_META: Record<CelestialSymbolType, CelestialSymbolMetadata> = {
  // Group A: 3D Reticle & Planetary Taxonomy
  'star': {
    type: 'star',
    label: 'Star',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types',
  },
  'stellar-system': {
    type: 'stellar-system',
    label: 'Stellar System',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types',
  },
  'multiple-system': {
    type: 'multiple-system',
    label: 'Multiple System',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types',
  },
  'brown-dwarf': {
    type: 'brown-dwarf',
    label: 'Brown Dwarf',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types/L-T-Y',
  },
  'white-dwarf': {
    type: 'white-dwarf',
    label: 'White Dwarf',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types/D',
  },
  'neutron-star': {
    type: 'neutron-star',
    label: 'Neutron Star',
    badgeStatus: 'critical',
    defaultGuideHref: '/guide/hazards/ionising-radiation',
  },
  'pulsar': {
    type: 'pulsar',
    label: 'Pulsar',
    badgeStatus: 'critical',
    defaultGuideHref: '/guide/hazards/ionising-radiation',
  },
  'hazard': {
    type: 'hazard',
    label: 'Relativistic Hazard',
    badgeStatus: 'critical',
    defaultGuideHref: '/guide/hazards',
  },
  'black-hole': {
    type: 'black-hole',
    label: 'Black Hole',
    badgeStatus: 'critical',
    defaultGuideHref: '/guide/hazards',
  },
  'barycentre': {
    type: 'barycentre',
    label: 'Barycentre',
    badgeStatus: 'neutral',
  },
  'stellar-cluster': {
    type: 'stellar-cluster',
    label: 'Stellar Cluster',
    badgeCategory: 'constellation',
  },
  'construct': {
    type: 'construct',
    label: 'Artificial Construct',
    badgeStatus: 'info',
  },
  'spacecraft': {
    type: 'spacecraft',
    label: 'Spacecraft',
    badgeStatus: 'info',
  },
  'terrestrial': {
    type: 'terrestrial',
    label: 'Terrestrial',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/terrestrial',
  },
  'super-earth': {
    type: 'super-earth',
    label: 'Super-Earth',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/super-earth',
  },
  'sub-neptune': {
    type: 'sub-neptune',
    label: 'Sub-Neptune',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/ice-giant',
  },
  'gas-giant': {
    type: 'gas-giant',
    label: 'Gas Giant',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/gas-giant',
  },
  'ice-giant': {
    type: 'ice-giant',
    label: 'Ice Giant',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/ice-giant',
  },

  // Group B: Sub-Planetary, Disk, Structure, & Environmental Taxonomy
  'dwarf-planet': {
    type: 'dwarf-planet',
    label: 'Dwarf Planet',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/terrestrial',
  },
  'moon': {
    type: 'moon',
    label: 'Moon',
    badgeStatus: 'neutral',
  },
  'asteroid': {
    type: 'asteroid',
    label: 'Asteroid',
    badgeStatus: 'neutral',
  },
  'comet': {
    type: 'comet',
    label: 'Comet',
    badgeStatus: 'info',
  },
  'belt': {
    type: 'belt',
    label: 'Circumstellar Belt',
    badgeStatus: 'neutral',
  },
  'asteroid-belt': {
    type: 'asteroid-belt',
    label: 'Asteroid Belt',
    badgeStatus: 'caution',
    defaultGuideHref: '/guide/planet-types/terrestrial',
  },
  'kuiper-belt': {
    type: 'kuiper-belt',
    label: 'Kuiper Belt',
    badgeStatus: 'info',
    defaultGuideHref: '/guide/planet-types/ice-giant',
  },
  'kuiper-belt-object': {
    type: 'kuiper-belt-object',
    label: 'Kuiper Belt Object',
    badgeStatus: 'neutral',
  },
  'oort-cloud': {
    type: 'oort-cloud',
    label: 'Oort Cloud',
    badgeStatus: 'info',
  },
  'debris-disk': {
    type: 'debris-disk',
    label: 'Debris Disk',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/metrics/semi-major-axis',
  },
  'nebula': {
    type: 'nebula',
    label: 'Nebula',
    badgeCategory: 'nebula',
  },
  'ism': {
    type: 'ism',
    label: 'Interstellar Cloud',
    badgeCategory: 'nebula',
  },
  'supernova-remnant': {
    type: 'supernova-remnant',
    label: 'Supernova Remnant',
    badgeCategory: 'nebula',
  },
  'habitable-zone': {
    type: 'habitable-zone',
    label: 'Habitable Zone',
    badgeStatus: 'nominal',
    defaultGuideHref: '/guide/planet-types/habitable-zone',
  },
};
