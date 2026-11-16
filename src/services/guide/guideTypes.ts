/**
 * DEC-027 / Phase 3.3A-1: Guide Service Domain Types
 * Strongly typed view-models & comparison interfaces for /guide/*.
 */

import type {
  CelestialSymbolType,
  SystemManifest,
  StellarComponent,
  ExoplanetRecord,
} from '../../types/astro';
import type { StarTypeGuideEntry } from '../../content/guide';
import {
  SOL_REFERENCE_TARGET,
  EARTH_REFERENCE_TARGET,
} from '../../config/referenceTargets';

export interface DecodedStarSubtype {
  readonly spectralLetter: string;
  readonly subdivision?: string;
  readonly luminosityClass?: string;
  readonly luminosityLabel?: string;
}

export interface ResolvedStarTypeDetail {
  readonly requestedRaw: string;
  readonly entry: StarTypeGuideEntry;
  readonly decodedSubtype?: DecodedStarSubtype;
}

export interface MetricTargetComparison {
  readonly targetId: string;
  readonly targetName: string;
  readonly targetHref: string;
  readonly targetValue: string;
  readonly targetFamiliar: string;
  readonly relativeRatioLabel: string;
  readonly isCatalogued: boolean;
  readonly numericValue?: number;
  readonly unit?: string;
  readonly reticleType?: CelestialSymbolType;
}

export interface MetricComparison {
  readonly metricId: string;
  readonly baselineName: typeof SOL_REFERENCE_TARGET.name | typeof EARTH_REFERENCE_TARGET.name;
  readonly baselineHref: string;
  readonly baselineValue: string;
  readonly baselineFamiliar: string;
  readonly baselineNumericValue?: number;
  readonly baselineUnit?: string;
  readonly baselineReticleType?: CelestialSymbolType;
  readonly targetId: string;
  readonly targetName: string;
  readonly targetHref: string;
  readonly targetValue: string;
  readonly targetFamiliar: string;
  readonly targetNumericValue?: number;
  readonly targetUnit?: string;
  readonly targetReticleType?: CelestialSymbolType;
  readonly relativeRatioLabel: string;
  readonly isFromFocusedContext: boolean;
  readonly isCatalogued?: boolean;
  readonly targets?: readonly MetricTargetComparison[];
}

export interface SpectralCombinationResult {
  readonly combinedCode: string;
  readonly effectiveTempK: number;
  readonly chromaticityToken: string;
  readonly radiusRsun: number;
  readonly luminosityLsun: number;
  readonly habitableZoneAu: string;
  readonly classEffect: string;
  readonly subdivisionEffect: string;
  readonly luminosityEffect: string;
}

export interface TargetEvaluationContext {
  readonly targetId: string;
  readonly targetName: string;
  readonly targetHref: string;
  readonly manifest: SystemManifest | null;
  readonly targetStar?: StellarComponent;
  readonly targetPlanet?: ExoplanetRecord;
}
