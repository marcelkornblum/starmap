import { describe, it, expect } from 'vitest';
import {
  buildTapRecentDiscoveriesQuery,
  auditRecentDiscoveriesAgainstCatalog,
  formatDiscoverySyncReport,
  type RecentDiscoveryItem,
} from '../scripts/sync-discoveries';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';
import type { DatasetLayerManifest } from '../src/types/astro';

describe('DEC-040: sync-discoveries pipeline helpers', () => {
  it('buildTapRecentDiscoveriesQuery creates a valid NASA Exoplanet Archive TAP query URL for sy_dist <= 100', () => {
    const defaultUrl = buildTapRecentDiscoveriesQuery();
    expect(defaultUrl).toContain('https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=');
    expect(defaultUrl).toContain('sy_dist<=100');
    expect(defaultUrl).toContain('pscomppars');
    expect(defaultUrl).toContain('format=csv');

    const customUrl = buildTapRecentDiscoveriesQuery({
      maxDistancePc: 50,
      minDiscoveryYear: 2024,
    });
    expect(customUrl).toContain('sy_dist<=50');
    expect(customUrl).toContain('disc_year>=2024');
  });

  it('auditRecentDiscoveriesAgainstCatalog correctly identifies matched hosts, existing entries, and new discoveries', () => {
    const mockCorpus: CompactSearchEntry[] = [
      {
        i: 'gaia-2452378776434477184',
        k: 1,
        n: 'Tau Ceti',
        p: [-3.1, -0.4, -2.0],
      },
      {
        i: 'lhs-1140',
        k: 1,
        n: 'LHS 1140',
        p: [10.2, 5.1, -8.3],
      },
    ];

    const mockLayer: DatasetLayerManifest = {
      layerId: 'overlay-recent-discoveries',
      title: 'Recent Exoplanet Discoveries',
      kind: 'scientific-overlay',
      description: 'Recent discoveries',
      version: 1,
      entries: {
        'lhs-1140-b': {
          targetId: 'lhs-1140-b',
          targetType: 'planet',
          systemId: 'lhs-1140',
          inUniverseName: 'LHS 1140 b',
          text: 'Already curated',
        },
      },
    };

    const discoveries: RecentDiscoveryItem[] = [
      {
        pl_name: 'LHS 1140 b',
        hostname: 'LHS 1140',
        sy_dist: 15,
        disc_year: 2024,
        discoverymethod: 'Transit',
      },
      {
        pl_name: 'Tau Ceti g',
        hostname: 'Tau Ceti',
        sy_dist: 3.65,
        disc_year: 2025,
        discoverymethod: 'Radial Velocity',
      },
      {
        pl_name: 'Unknown Star b',
        hostname: 'Unknown Star 1234',
        sy_dist: 45,
        disc_year: 2025,
        discoverymethod: 'Transit',
      },
    ];

    const audit = auditRecentDiscoveriesAgainstCatalog(
      discoveries,
      mockCorpus,
      mockLayer.entries,
    );

    expect(audit.totalDiscoveries).toBe(3);
    expect(audit.alreadyCurated).toHaveLength(1);
    expect(audit.alreadyCurated[0].pl_name).toBe('LHS 1140 b');

    expect(audit.candidatesToCurate).toHaveLength(1);
    expect(audit.candidatesToCurate[0].pl_name).toBe('Tau Ceti g');
    expect(audit.candidatesToCurate[0].systemId).toBe('gaia-2452378776434477184');

    expect(audit.missingHostStars).toHaveLength(1);
    expect(audit.missingHostStars[0].hostname).toBe('Unknown Star 1234');
  });

  it('formatDiscoverySyncReport formats a comprehensive markdown summary', () => {
    const report = formatDiscoverySyncReport({
      totalDiscoveries: 3,
      alreadyCurated: [{ pl_name: 'LHS 1140 b', hostname: 'LHS 1140' }],
      candidatesToCurate: [
        {
          pl_name: 'Tau Ceti g',
          hostname: 'Tau Ceti',
          sy_dist: 3.65,
          disc_year: 2025,
          discoverymethod: 'Radial Velocity',
          systemId: 'gaia-2452378776434477184',
        },
      ],
      missingHostStars: [{ pl_name: 'Unknown Star b', hostname: 'Unknown Star 1234', sy_dist: 45 }],
    });

    expect(report).toContain('### Recent Exoplanet Discoveries (< 100 pc) Sync Audit');
    expect(report).toContain('**Total Inspected:** 3');
    expect(report).toContain('**Already in Layer:** 1');
    expect(report).toContain('**Ready to Curate:** 1');
    expect(report).toContain('**Host Missing in Catalog:** 1');
    expect(report).toContain('Tau Ceti g');
    expect(report).toContain('Unknown Star 1234');
  });
});
