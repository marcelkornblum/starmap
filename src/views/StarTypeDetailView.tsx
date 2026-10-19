import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  GuideExamplesList,
  GuideSectionNav,
  StarTypeCombinator,
} from '../components/domain';
import { Badge } from '../components/interface';
import {
  STAR_TYPES_GUIDE_PATH,
  resolveStarTypeGuideEntry,
} from '../services/guideService';
import styles from './GuideViews.module.css';

export interface StarTypeDetailViewProps {
  readonly starType?: string;
  readonly locationPathname?: string;
}

export const extractStarTypeFromPathname = (pathname: string): string => {
  const match = /^\/guide\/star-types\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const StarTypeDetailView: React.FC<StarTypeDetailViewProps> = ({
  starType: propStarType,
  locationPathname,
}) => {
  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
  const resolvedStarType = propStarType ?? extractStarTypeFromPathname(pathname);

  const resolvedDetail = useMemo(
    () => resolveStarTypeGuideEntry(resolvedStarType),
    [resolvedStarType],
  );

  const initialClass = useMemo(() => {
    if (resolvedDetail?.decodedSubtype?.spectralLetter) {
      return resolvedDetail.decodedSubtype.spectralLetter;
    }
    if (resolvedDetail?.entry) {
      return resolvedDetail.entry.spectralClass === 'L/T/Y'
        ? 'L'
        : resolvedDetail.entry.spectralClass;
    }
    return 'G';
  }, [resolvedDetail]);

  const initialSub = useMemo(() => {
    if (resolvedDetail?.decodedSubtype?.subdivision) {
      return resolvedDetail.decodedSubtype.subdivision;
    }
    return '2';
  }, [resolvedDetail]);

  const initialLum = useMemo(() => {
    if (resolvedDetail?.decodedSubtype?.luminosityClass) {
      return resolvedDetail.decodedSubtype.luminosityClass;
    }
    if (resolvedDetail?.entry.id === 'd') {
      return 'VII';
    }
    return 'V';
  }, [resolvedDetail]);

  return (
    <main
      data-testid="star-type-detail-view-root"
      data-star-type={resolvedStarType}
      className={styles.guideRoot}
    >
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Star Types', href: STAR_TYPES_GUIDE_PATH },
          { label: resolvedStarType || 'Star Type' },
        ]}
      />
      <GuideSectionNav currentSection="star-types" />
      <h1>{resolvedStarType ? `Star Type: ${resolvedStarType}` : 'Star Type'}</h1>
      <p>
        <a href={STAR_TYPES_GUIDE_PATH} data-testid="star-types-list-link">
          All Star Types
        </a>
      </p>

      {resolvedDetail ? (
        <>
          <StarTypeCombinator
            key={`${resolvedStarType}-${initialClass}-${initialSub}-${initialLum}`}
            initialClass={initialClass}
            initialSubdivision={initialSub}
            initialLuminosity={initialLum}
          />

          <section className={styles.cardItem}>
            <div>
              <Badge category="star">{resolvedDetail.entry.spectralClass}</Badge>{' '}
              <strong>{resolvedDetail.entry.title}</strong>
            </div>
            <p data-testid="guide-detail-summary">{resolvedDetail.entry.summary}</p>

            {resolvedDetail.decodedSubtype && (
              <section data-testid="star-type-decoded-subtype">
                <h3>Decoded Yerkes Classification</h3>
                <dl className={styles.telemetryDl}>
                  <dt>Spectral Letter</dt>
                  <dd>{resolvedDetail.decodedSubtype.spectralLetter}</dd>
                  {resolvedDetail.decodedSubtype.subdivision && (
                    <>
                      <dt>Subdivision</dt>
                      <dd>{resolvedDetail.decodedSubtype.subdivision}</dd>
                    </>
                  )}
                  {resolvedDetail.decodedSubtype.luminosityClass && (
                    <>
                      <dt>Luminosity Class</dt>
                      <dd>
                        {resolvedDetail.decodedSubtype.luminosityClass}
                        {resolvedDetail.decodedSubtype.luminosityLabel
                          ? ` (${resolvedDetail.decodedSubtype.luminosityLabel})`
                          : ''}
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            )}

            <h3>Reference Telemetry Range</h3>
            <dl data-testid="guide-detail-telemetry" className={styles.telemetryDl}>
              <dt>Effective Temperature</dt>
              <dd>{resolvedDetail.entry.effectiveTempRange}</dd>
              <dt>Mass Range</dt>
              <dd>{resolvedDetail.entry.massRangeMsun}</dd>
              <dt>Radius Range</dt>
              <dd>{resolvedDetail.entry.radiusRangeRsun}</dd>
              <dt>Luminosity Range</dt>
              <dd>{resolvedDetail.entry.luminosityRangeLsun}</dd>
              <dt>Habitable Zone</dt>
              <dd>{resolvedDetail.entry.habitableZoneAu}</dd>
              <dt>Chromaticity</dt>
              <dd>{resolvedDetail.entry.chromaticity}</dd>
            </dl>
          </section>

          <GuideExamplesList examples={resolvedDetail.entry.examples} />
        </>
      ) : (
        <p>No guide record found for stellar classification &quot;{resolvedStarType}&quot;.</p>
      )}
    </main>
  );
};
