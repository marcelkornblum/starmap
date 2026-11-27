import React, { useMemo } from 'react';
import { Guide3DPreview } from '../components/domain/Guide3DPreview';
import { GuideExamplesList } from '../components/domain/GuideExamplesList';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { SpatialShell } from '../components/domain/SpatialShell';
import {
  Block,
  Button,
  CelestialBadge,
  Cluster,
  CollapsibleSection,
  Datum,
  Heading,
  Stack,
} from '../components/interface';
import { extractFocusIdFromSearch } from '../services/guide/guideNavigation';
import {
  getGuideExamplesForEntry,
  resolvePlanetTypeGuideEntries,
} from '../services/guide/guideCatalogExamples';
import { useHydratedGuideExamples } from '../hooks/useGuideData';
import { useParams } from '@tanstack/react-router';
import { useSpaLocation } from '../hooks/useSpaLocation';
import styles from './GuideViews.module.css';

export interface PlanetTypeDetailViewProps {
  readonly planetType?: string;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

export const PlanetTypeDetailView: React.FC<PlanetTypeDetailViewProps> = ({
  planetType: propPlanetType,
  locationPathname,
  locationSearch,
}) => {
  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const { search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '',
  );
  const resolvedPlanetType =
    routeParams?.planetType ?? propPlanetType ?? '';
  const focusedEntityId = extractFocusIdFromSearch(search);

  useHydratedGuideExamples();

  const entries = useMemo(
    () => resolvePlanetTypeGuideEntries(resolvedPlanetType),
    [resolvedPlanetType],
  );

  const companionMapHref = focusedEntityId
    ? `/galaxy?focus=${encodeURIComponent(focusedEntityId)}`
    : undefined;

  return (
    <SpatialShell
      mode="document"
      testId="planet-type-detail-view-root"
      activeWorkspace="guide"
      companionMapHref={companionMapHref}
      data-planet-type={resolvedPlanetType}
    >
      <div className={styles.guideRoot}>
      <GuideSectionNav currentSection="planet-types" />
      {focusedEntityId && (
        <div data-testid="guide-focus-context">
          <Button
            href={`/system/${encodeURIComponent(focusedEntityId)}?focus=${encodeURIComponent(focusedEntityId)}`}
            variant="default"
            size="sm"
          >
            Return to {focusedEntityId}
          </Button>
        </div>
      )}
      <Heading as="h1" size="title">
        {resolvedPlanetType
          ? `Planet Type: ${resolvedPlanetType}`
          : 'Planet Type'}
      </Heading>

      {entries.length > 0 ? (
        <>
          {entries.map((entry) => (
            <Block as="section" padding="default" key={entry.id}>
              <Stack gap="fib-3">
                <Guide3DPreview
                  kind="planet"
                  composition={entry.composition}
                  radiusRearth={entry.canonicalRadiusRearth}
                  textureTheme={entry.textureTheme}
                  isDetail
                />

                <Cluster gap="tight" align="center">
                  <CelestialBadge type={entry.composition} />
                  <strong>{entry.title}</strong>
                </Cluster>

                <p data-testid="guide-detail-summary">{entry.summary}</p>

                <CollapsibleSection title="Geophysical & Atmospheric Telemetry" headingAs="h3">
                  <Stack gap="none" data-testid="guide-detail-telemetry">
                    <Datum label="Mass Range" value={entry.massRangeMearth} />
                    <Datum label="Radius Range" value={entry.radiusRangeRearth} />
                    <Datum label="Bulk Composition" value={entry.bulkComposition} />
                    <Datum label="Habitability" value={entry.habitabilityNotes} />
                  </Stack>
                </CollapsibleSection>

                <GuideExamplesList
                  examples={getGuideExamplesForEntry('planetTypes', entry.id)}
                  reticleType={entry.composition ?? 'terrestrial'}
                />
              </Stack>
            </Block>
          ))}
        </>
      ) : (
        <p>No guide record found for planet classification &quot;{resolvedPlanetType}&quot;.</p>
      )}
      </div>
    </SpatialShell>
  );
};
