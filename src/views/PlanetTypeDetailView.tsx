import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  Guide3DPreview,
  GuideExamplesList,
  GuideSectionNav,
} from '../components/domain';
import { Badge } from '../components/interface';
import {
  PLANET_TYPES_GUIDE_PATH,
  resolvePlanetTypeGuideEntry,
} from '../services/guideService';
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
  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
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
      <h1>
        {resolvedPlanetType
          ? `Planet Type: ${resolvedPlanetType}`
          : 'Planet Type'}
      </h1>
      <p>
        <a
          href={PLANET_TYPES_GUIDE_PATH}
          data-testid="planet-types-list-link"
        >
          All Planet Types
        </a>
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

            <div>
              <Badge category="planet">{entry.composition}</Badge>{' '}
              <strong>{entry.title}</strong>
            </div>

            <p data-testid="guide-detail-summary">{entry.summary}</p>

            <h3>Geophysical & Atmospheric Telemetry</h3>
            <dl data-testid="guide-detail-telemetry" className={styles.telemetryDl}>
              <dt>Mass Range</dt>
              <dd>{entry.massRangeMearth}</dd>
              <dt>Radius Range</dt>
              <dd>{entry.radiusRangeRearth}</dd>
              <dt>Bulk Composition</dt>
              <dd>{entry.bulkComposition}</dd>
              <dt>Habitability</dt>
              <dd>{entry.habitabilityNotes}</dd>
            </dl>
          </section>

          <GuideExamplesList examples={entry.examples} />
        </>
      ) : (
        <p>No guide record found for planet classification &quot;{resolvedPlanetType}&quot;.</p>
      )}
    </main>
  );
};
