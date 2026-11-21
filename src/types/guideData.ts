import type { CelestialSymbolType } from './astro';

export type GuideSectionKey = 'starTypes' | 'planetTypes' | 'metricTypes' | 'hazardTypes';

export type GuideExampleScope = 'galaxy' | 'system' | 'planet';

export interface GuideExampleSeedItem {
  readonly entityId: string;
  readonly scope: GuideExampleScope;
  readonly systemId?: string;
  readonly framing?: string;
}

export type GuideExamplesSeedFile = Record<
  GuideSectionKey,
  Record<string, readonly GuideExampleSeedItem[]>
>;

export interface ResolvedGuideExampleItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly note: string;
  readonly reticleType?: CelestialSymbolType;
}

export interface GuideExamplesDataset {
  readonly version: number;
  readonly generatedAt: string;
  readonly sections: Record<
    GuideSectionKey,
    Record<string, readonly ResolvedGuideExampleItem[]>
  >;
}

export interface StructuredBaselineValue {
  readonly value: number;
  readonly unit: string;
}

export interface SolBaselineRecord {
  readonly id: string;
  readonly name: string;
  readonly properName?: string;
  readonly systemId: string;
  readonly href: string;
  readonly spectralType: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly massMsun: StructuredBaselineValue;
  readonly radiusRsun: StructuredBaselineValue;
  readonly luminosityLsun: StructuredBaselineValue;
  readonly effectiveTempK: StructuredBaselineValue;
  readonly visualMagnitude: StructuredBaselineValue;
  readonly absoluteMagnitude: StructuredBaselineValue;
  readonly reticleType: CelestialSymbolType;
}

export interface EarthBaselineRecord {
  readonly id: string;
  readonly name: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly href: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly massMearth: StructuredBaselineValue;
  readonly radiusRearth: StructuredBaselineValue;
  readonly semiMajorAxisAu: StructuredBaselineValue;
  readonly periodDays: StructuredBaselineValue;
  readonly inclinationDeg: StructuredBaselineValue;
  readonly equilibriumTempK: StructuredBaselineValue;
  readonly surfaceGravityG: StructuredBaselineValue;
  readonly reticleType: CelestialSymbolType;
}

export interface BenchmarkSystemBaselineRecord {
  readonly id: string;
  readonly systemId: string;
  readonly name: string;
  readonly href: string;
  readonly spectralType?: string;
  readonly coordinatesPc: readonly [number, number, number];
  readonly visualMagnitude?: StructuredBaselineValue;
  readonly absoluteMagnitude?: StructuredBaselineValue;
  readonly reticleType: CelestialSymbolType;
}

export interface BenchmarkPlanetBaselineRecord {
  readonly id: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly name: string;
  readonly href: string;
  readonly semiMajorAxisAu?: StructuredBaselineValue;
  readonly periodDays?: StructuredBaselineValue;
  readonly massMearth?: StructuredBaselineValue;
  readonly radiusRearth?: StructuredBaselineValue;
  readonly equilibriumTempK?: StructuredBaselineValue;
  readonly surfaceGravityG?: StructuredBaselineValue;
  readonly reticleType: CelestialSymbolType;
}

export interface MetricBaselineSummary {
  readonly baselineId: string;
  readonly baselineName: string;
  readonly baselineHref: string;
  readonly baselineReticleType: CelestialSymbolType;
  readonly value: string;
  readonly familiar: string;
  readonly numericValue?: number;
  readonly unit: string;
}

export interface ReferenceBaselinesDataset {
  readonly version: number;
  readonly generatedAt: string;
  readonly targets: {
    readonly sol: SolBaselineRecord;
    readonly earth: EarthBaselineRecord;
    readonly stellarBenchmark: BenchmarkSystemBaselineRecord;
    readonly orbitalBenchmark: BenchmarkPlanetBaselineRecord;
  };
  readonly metrics: Record<string, MetricBaselineSummary>;
}
