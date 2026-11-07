import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  GuideExamplesList,
  GuideSectionNav,
  StarTypeCombinator,
} from '../components/domain';
import {
  Button,
  CelestialSymbol,
  Cluster,
  Datum,
  Heading,
  SpectralBadge,
  Stack,
} from '../components/interface';
import {
  STAR_TYPES_GUIDE_PATH,
  extractFocusIdFromSearch,
  resolveStarTypeGuideEntries,
} from '../services/guideService';
import { useSpaLocation } from '../hooks/useSpaLocation';
import styles from './GuideViews.module.css';

export interface StarTypeDetailViewProps {
  readonly starType?: string;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

export const extractStarTypeFromPathname = (pathname: string): string => {
  const match = /^\/guide\/star-types\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const StarTypeDetailView: React.FC<StarTypeDetailViewProps> = ({
  starType: propStarType,
  locationPathname,
  locationSearch,
}) => {
  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '',
  );
  const resolvedStarType = propStarType ?? extractStarTypeFromPathname(pathname);
  const focusedEntityId = extractFocusIdFromSearch(search);

  const resolvedDetails = useMemo(
    () => resolveStarTypeGuideEntries(resolvedStarType),
    [resolvedStarType],
  );

  const primaryDetail = resolvedDetails[0];

  const initialClass = useMemo(() => {
    if (primaryDetail?.decodedSubtype?.spectralLetter) {
      return primaryDetail.decodedSubtype.spectralLetter;
    }
    if (primaryDetail?.entry) {
      return primaryDetail.entry.spectralClass === 'L/T/Y'
        ? 'L'
        : primaryDetail.entry.spectralClass;
    }
    return 'G';
  }, [primaryDetail]);

  const initialSub = useMemo(() => {
    if (primaryDetail?.decodedSubtype?.subdivision) {
      return primaryDetail.decodedSubtype.subdivision;
    }
    return '2';
  }, [primaryDetail]);

  const initialLum = useMemo(() => {
    if (primaryDetail?.decodedSubtype?.luminosityClass) {
      return primaryDetail.decodedSubtype.luminosityClass;
    }
    if (primaryDetail?.entry.id === 'd') {
      return 'VII';
    }
    return 'V';
  }, [primaryDetail]);

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
        companionHref={
          focusedEntityId
            ? `/galaxy?focus=${encodeURIComponent(focusedEntityId)}`
            : undefined
        }
      />
      <GuideSectionNav currentSection="star-types" />
      <Heading as="h1">{resolvedStarType ? `Star Type: ${resolvedStarType}` : 'Star Type'}</Heading>

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
          href={STAR_TYPES_GUIDE_PATH}
          variant="subtle"
          size="sm"
          data-testid="star-types-list-link"
        >
          All Star Types
        </Button>
      </p>

      {resolvedDetails.length > 0 ? (
        <>
          {resolvedDetails.length === 1 && (
            <StarTypeCombinator
              key={`${resolvedStarType}-${initialClass}-${initialSub}-${initialLum}`}
              initialClass={initialClass}
              initialSubdivision={initialSub}
              initialLuminosity={initialLum}
            />
          )}

          {resolvedDetails.map((resolvedDetail) => (
            <section
              key={resolvedDetail.requestedRaw}
              className={styles.cardItem}
            >
              <Cluster gap="tight" align="center">
                <CelestialSymbol
                  type={
                    resolvedDetail.entry.spectralClass === 'D'
                      ? 'white-dwarf'
                      : resolvedDetail.entry.spectralClass === 'L' ||
                          resolvedDetail.entry.spectralClass === 'T' ||
                          resolvedDetail.entry.spectralClass === 'Y'
                        ? 'brown-dwarf'
                        : 'star'
                  }
                  size="sm"
                  showTooltip={false}
                />
                <SpectralBadge spectralType={resolvedDetail.entry.spectralClass} interactive={false} />{' '}
                <strong>
                  {resolvedDetail.requestedRaw || resolvedDetail.entry.spectralClass}
                </strong>
                <span> — {resolvedDetail.entry.title}</span>
              </Cluster>
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

              <GuideExamplesList examples={resolvedDetail.entry.examples} />
            </section>
          ))}
        </>
      ) : (
        <p>No guide record found for stellar classification &quot;{resolvedStarType}&quot;.</p>
      )}
    </main>
  );
};
