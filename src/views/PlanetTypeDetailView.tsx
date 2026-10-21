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
  resolvePlanetTypeGuideEntry,
} from '../services/guideService';
import { useSpaLocation } from '../router';
import styles from './GuideViews.module.css';

export interface PlanetTypeDetailViewProps {
  readonly planetType?: string;
  readonly locationPathname?: string;
}

export const extractPlanetTypeFromPathname = (pathname: string): string => {
  const match = /^\/guide\/planet-types\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const PlanetTypeDetailView: React.FC<PlanetTypeDetailViewProps> = ({
  planetType: propPlanetType,
  locationPathname,
}) => {
  const { pathname } = useSpaLocation(locationPathname, undefined, '');
  const resolvedPlanetType =
    propPlanetType ?? extractPlanetTypeFromPathname(pathname);

  const entry = useMemo(
    () => resolvePlanetTypeGuideEntry(resolvedPlanetType),
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
      />
      <GuideSectionNav currentSection="planet-types" />
      <Heading as="h1">
        {resolvedPlanetType
          ? `Planet Type: ${resolvedPlanetType}`
          : 'Planet Type'}
      </Heading>
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

      {entry ? (
        <>
          <section className={styles.cardItem}>
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
          </section>

          <GuideExamplesList examples={entry.examples} />
        </>
      ) : (
        <p>No guide record found for planet classification &quot;{resolvedPlanetType}&quot;.</p>
      )}
    </main>
  );
};
