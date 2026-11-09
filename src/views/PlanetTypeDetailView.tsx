import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  Guide3DPreview,
  GuideExamplesList,
  GuideSectionNav,
} from '../components/domain';
import {
  Button,
  CelestialBadge,
  Cluster,
  Datum,
  Heading,
  Stack,
} from '../components/interface';
import {
  PLANET_TYPES_GUIDE_PATH,
  extractFocusIdFromSearch,
  resolvePlanetTypeGuideEntries,
} from '../services/guideService';
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

  const entries = useMemo(
    () => resolvePlanetTypeGuideEntries(resolvedPlanetType),
    [resolvedPlanetType],
  );

  return (
    <main
      data-testid="planet-type-detail-view-root"
      data-planet-type={resolvedPlanetType}
      className={styles.guideRoot}
    >
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Planet Types', href: PLANET_TYPES_GUIDE_PATH },
          { label: resolvedPlanetType || 'Planet Type' },
        ]}
        companionHref={
          focusedEntityId
            ? `/galaxy?focus=${encodeURIComponent(focusedEntityId)}`
            : undefined
        }
      />
      <GuideSectionNav currentSection="planet-types" />
      <Heading as="h1">
        {resolvedPlanetType
          ? `Planet Type: ${resolvedPlanetType}`
          : 'Planet Type'}
      </Heading>

      {focusedEntityId && (
        <div data-testid="guide-focus-context">
          <Button
            href={`/system/${encodeURIComponent(focusedEntityId)}?focus=${encodeURIComponent(focusedEntityId)}`}
            variant="subtle"
            size="sm"
          >
            Return to {focusedEntityId}
          </Button>
        </div>
      )}

      <p>
        <Button
          href={PLANET_TYPES_GUIDE_PATH}
          variant="subtle"
          size="sm"
          data-testid="planet-types-list-link"
        >
          All Planet Types
        </Button>
      </p>

      {entries.length > 0 ? (
        <>
          {entries.map((entry) => (
            <section key={entry.id} className={styles.cardItem}>
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

              <Heading as="h3">Geophysical & Atmospheric Telemetry</Heading>
              <Stack gap="none" data-testid="guide-detail-telemetry">
                <Datum label="Mass Range" value={entry.massRangeMearth} />
                <Datum label="Radius Range" value={entry.radiusRangeRearth} />
                <Datum label="Bulk Composition" value={entry.bulkComposition} />
                <Datum label="Habitability" value={entry.habitabilityNotes} />
              </Stack>

              <GuideExamplesList
                examples={entry.examples}
                reticleType={entry.composition ?? 'terrestrial'}
              />
            </section>
          ))}
        </>
      ) : (
        <p>No guide record found for planet classification &quot;{resolvedPlanetType}&quot;.</p>
      )}
    </main>
  );
};
