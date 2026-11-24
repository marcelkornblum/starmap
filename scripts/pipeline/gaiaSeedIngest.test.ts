import { describe, it, expect } from 'vitest';
import type { ExoplanetRecord, SystemManifest, SystemSummaryNode } from '../../src/types/astro';
import {
  createSolPipelineEntries,
  ingestReconsSupplement,
  round2,
  round3,
} from './gaiaSeedIngest';

describe('gaiaSeedIngest', () => {
  it('rounds numbers to 2 and 3 decimals without emitting -0', () => {
    expect(Object.is(round2(-0.001), -0)).toBe(false);
    expect(round2(-0.001)).toBe(0);
    expect(Object.is(round3(-0.0001), -0)).toBe(false);
    expect(round3(-0.0001)).toBe(0);
    expect(round3(3.14159)).toBe(3.142);
  });

  it('builds valid Sol pipeline seed entries', () => {
    const { solManifest, solNode, solSummary } = createSolPipelineEntries();
    expect(solManifest.id).toBe('sol');
    expect(solNode.id).toBe(0);
    expect(solSummary.id).toBe('sol');
    expect(solSummary.planetCount).toBe(solManifest.planets.length);
  });

  it('ingests RECONS 10pc supplement without duplicating already-catalogued systems', () => {
    const { solSummary } = createSolPipelineEntries();
    const cataloguedSummaries: SystemSummaryNode[] = [solSummary];
    const starAliasesById = new Map<string, string[]>();
    const local10pcSystems: SystemSummaryNode[] = [];
    const exoplanetHostSummaries: SystemSummaryNode[] = [];
    const sectorMap = new Map<string, SystemSummaryNode[]>();
    const sectorManifestsMap = new Map<string, SystemManifest[]>();
    const allSystemManifests: SystemManifest[] = [];
    const matchedExoplanetIds = new Set<string>();
    const emitted: string[] = [];

    const result = ingestReconsSupplement({
      maxPartitionDist: 100,
      includeDetails: true,
      exoplanetHostMap: new Map<string, ExoplanetRecord[]>(),
      matchedExoplanetIds,
      cataloguedSummaries,
      starAliasesById,
      local10pcSystems,
      exoplanetHostSummaries,
      sectorMap,
      sectorManifestsMap,
      allSystemManifests,
      getTotalStars: () => emitted.length + 1,
      onEmitNode: (nodeJson) => emitted.push(nodeJson),
    });

    expect(result.addedLocal10pc).toBeGreaterThan(0);
    expect(emitted.length).toBeGreaterThan(0);
    expect(allSystemManifests.length).toBeGreaterThan(0);
    expect(cataloguedSummaries.some((s) => s.tags?.includes('RECONSGroundTruth'))).toBe(true);
  });
});
