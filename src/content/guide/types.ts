/**
 * DEC-R032 / AUD-071: Guide Package Types & Shared URL Builders
 * Strongly typed astronomical and telemetry catalog interfaces for /guide/*.
 */

import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  buildStarTypeGuideHref,
  buildPlanetTypeGuideHref,
  buildMetricGuideHref,
  buildHazardGuideHref,
} from '../../utils/url';
import type { CelestialSymbolType } from '../../types/astro';

export {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  buildStarTypeGuideHref,
  buildPlanetTypeGuideHref,
  buildMetricGuideHref,
  buildHazardGuideHref,
};

export const PLANET_COMPOSITION_TYPES = [
  'terrestrial',
  'super-earth',
  'ice-giant',
  'gas-giant',
] as const;

export type PlanetCompositionClass = (typeof PLANET_COMPOSITION_TYPES)[number];

export interface GuideExampleTarget {
  readonly name: string;
  readonly href: string;
  readonly note: string;
  readonly reticleType?: CelestialSymbolType;
}

export interface GuideCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly symbol?: string;
  readonly summary: string;
}

export interface StarTypeGuideEntry {
  readonly id: string;
  readonly spectralClass: string;
  readonly title: string;
  readonly summary: string;
  readonly effectiveTempRange: string;
  readonly massRangeMsun: string;
  readonly radiusRangeRsun: string;
  readonly luminosityRangeLsun: string;
  readonly habitableZoneAu: string;
  readonly chromaticity: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
  readonly canonicalRadiusRsun: number;
  readonly canonicalTempK: number;
  readonly chromaticityHex: string;
  readonly interiorLayers: readonly string[];
}

export interface PlanetTypeGuideEntry {
  readonly id: PlanetCompositionClass;
  readonly composition: PlanetCompositionClass;
  readonly title: string;
  readonly summary: string;
  readonly massRangeMearth: string;
  readonly radiusRangeRearth: string;
  readonly bulkComposition: string;
  readonly habitabilityNotes: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
  readonly canonicalRadiusRearth: number;
  readonly textureTheme: string;
  readonly interiorLayers: readonly string[];
}

export interface MetricGuideEntry {
  readonly id: string;
  readonly title: string;
  readonly unitSymbol: string;
  readonly symbol?: string;
  readonly category: 'Astrometry' | 'Stellar Telemetry' | 'Orbital & Planetary Telemetry';
  readonly summary: string;
  readonly physicalDefinition: string;
  readonly referenceBaseline: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
  readonly familiarConversion: string;
  readonly comparisonBaselineLabel: 'Sol' | 'Earth';
  readonly comparisonBaselineValue: string;
}

export interface HazardGuideEntry {
  readonly id:
    | 'flare-star'
    | 'ionising-radiation'
    | 'variable-flux'
    | 'extreme-heat'
    | 'cryogenic-cold'
    | 'high-gravity'
    | 'tidal-locking'
    | 'high-eccentricity';
  readonly title: string;
  readonly severity: 'warning' | 'critical';
  readonly domain: 'stellar' | 'planetary';
  readonly domainLabel: 'Stellar System Hazard' | 'Planetary Hazard';
  readonly thresholdCriteria: string;
  readonly summary: string;
  readonly physicalMechanism: string;
  readonly operationalImpact: string;
  readonly mitigationNotes: string;
  readonly href: string;
  readonly examples: readonly GuideExampleTarget[];
}
