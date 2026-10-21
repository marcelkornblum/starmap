import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  GuideExamplesList,
  GuideSectionNav,
  StarTypeCombinator,
} from '../components/domain';
import {
  Badge,
  Button,
  Datum,
  Heading,
  Stack,
} from '../components/interface';
import {
  STAR_TYPES_GUIDE_PATH,
  resolveStarTypeGuideEntry,
} from '../services/guideService';
import { useSpaLocation } from '../router';
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
  const { pathname } = useSpaLocation(locationPathname, undefined, '');
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
      <Heading as="h1">{resolvedStarType ? `Star Type: ${resolvedStarType}` : 'Star Type'}</Heading>
      <p>
        <Button
          href={STAR_TYPES_GUIDE_PATH}
          variant="subtle"
          size="sm"
          data-testid="star-types-list-link"
        >
          All Star Types
        </Button>
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
                <Heading as="h3">Decoded Yerkes Classification</Heading>
                <Stack gap="none">
                  <Datum label="Spectral Letter" value={resolvedDetail.decodedSubtype.spectralLetter} />
                  {resolvedDetail.decodedSubtype.subdivision && (
                    <Datum label="Subdivision" value={resolvedDetail.decodedSubtype.subdivision} />
                  )}
                  {resolvedDetail.decodedSubtype.luminosityClass && (
                    <Datum
                      label="Luminosity Class"
                      value={
                        resolvedDetail.decodedSubtype.luminosityLabel
                          ? `${resolvedDetail.decodedSubtype.luminosityClass} (${resolvedDetail.decodedSubtype.luminosityLabel})`
                          : resolvedDetail.decodedSubtype.luminosityClass
                      }
                    />
                  )}
                </Stack>
              </section>
            )}

            <Heading as="h3">Reference Telemetry Range</Heading>
            <Stack gap="none" data-testid="guide-detail-telemetry">
              <Datum label="Effective Temperature" value={resolvedDetail.entry.effectiveTempRange} />
              <Datum label="Mass Range" value={resolvedDetail.entry.massRangeMsun} />
              <Datum label="Radius Range" value={resolvedDetail.entry.radiusRangeRsun} />
              <Datum label="Luminosity Range" value={resolvedDetail.entry.luminosityRangeLsun} />
              <Datum label="Habitable Zone" value={resolvedDetail.entry.habitableZoneAu} />
              <Datum label="Chromaticity" value={resolvedDetail.entry.chromaticity} />
            </Stack>
          </section>

          <GuideExamplesList examples={resolvedDetail.entry.examples} />
        </>
      ) : (
        <p>No guide record found for stellar classification &quot;{resolvedStarType}&quot;.</p>
      )}
    </main>
  );
};
