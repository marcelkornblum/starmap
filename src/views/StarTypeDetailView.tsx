import React, { useMemo } from 'react';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { GuideExamplesList } from '../components/domain/GuideExamplesList';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { SpatialShell } from '../components/domain/SpatialShell';
import { StarTypeCombinator } from '../components/domain/StarTypeCombinator';
import {
  Block,
  Button,
  CelestialSymbol,
  Cluster,
  CollapsibleSection,
  Datum,
  Heading,
  SpectralBadge,
  Stack,
} from '../components/interface';
import { STAR_TYPES_GUIDE_PATH } from '../content/guide';
import { extractFocusIdFromSearch } from '../services/guide/guideNavigation';
import {
  getGuideExamplesForEntry,
  resolveStarTypeGuideEntries,
} from '../services/guide/guideCatalogExamples';
import { useHydratedGuideExamples } from '../hooks/useGuideData';
import { useParams } from '@tanstack/react-router';
import { useSpaLocation } from '../hooks/useSpaLocation';
import styles from './GuideViews.module.css';

export interface StarTypeDetailViewProps {
  readonly starType?: string;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

export const StarTypeDetailView: React.FC<StarTypeDetailViewProps> = ({
  starType: propStarType,
  locationPathname,
  locationSearch,
}) => {
  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const { search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '',
  );
  const resolvedStarType = routeParams?.starType ?? propStarType ?? '';
  const focusedEntityId = extractFocusIdFromSearch(search);

  useHydratedGuideExamples();

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

  const companionMapHref = focusedEntityId
    ? `/galaxy?focus=${encodeURIComponent(focusedEntityId)}`
    : undefined;

  return (
    <SpatialShell
      mode="document"
      testId="star-type-detail-view-root"
      activeWorkspace="guide"
      companionMapHref={companionMapHref}
      data-star-type={resolvedStarType}
    >
      <div className={styles.guideRoot}>
      <GuideSectionNav currentSection="star-types" />
      <Cluster justify="between" align="center" gap="tight">
        <Breadcrumbs
          items={[
            { label: 'Star Types', href: STAR_TYPES_GUIDE_PATH },
            { label: resolvedStarType || 'Star Type' },
          ]}
        />
        <Cluster gap="tight" align="center">
          <Button
            href={STAR_TYPES_GUIDE_PATH}
            variant="subtle"
            size="sm"
            data-testid="star-types-list-link"
          >
            All Star Types
          </Button>
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
        </Cluster>
      </Cluster>
      <Heading as="h1" size="title">{resolvedStarType ? `Star Type: ${resolvedStarType}` : 'Star Type'}</Heading>

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
            <Block
              as="section"
              padding="default"
              key={resolvedDetail.requestedRaw}
            >
              <Stack gap="fib-3">
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
                  <CollapsibleSection
                    title="Decoded Yerkes Classification"
                    headingAs="h3"
                    data-testid="star-type-decoded-subtype"
                  >
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
                  </CollapsibleSection>
                )}

                <CollapsibleSection title="Reference Telemetry Range" headingAs="h3">
                  <Stack gap="none" data-testid="guide-detail-telemetry">
                    <Datum label="Effective Temperature" value={resolvedDetail.entry.effectiveTempRange} />
                    <Datum label="Mass Range" value={resolvedDetail.entry.massRangeMsun} />
                    <Datum label="Radius Range" value={resolvedDetail.entry.radiusRangeRsun} />
                    <Datum label="Luminosity Range" value={resolvedDetail.entry.luminosityRangeLsun} />
                    <Datum label="Habitable Zone" value={resolvedDetail.entry.habitableZoneAu} />
                    <Datum label="Chromaticity" value={resolvedDetail.entry.chromaticity} />
                  </Stack>
                </CollapsibleSection>

                <GuideExamplesList
                  examples={getGuideExamplesForEntry('starTypes', resolvedDetail.entry.id)}
                  reticleType="star"
                />
              </Stack>
            </Block>
          ))}
        </>
      ) : (
        <p>No guide record found for stellar classification &quot;{resolvedStarType}&quot;.</p>
      )}
      </div>
    </SpatialShell>
  );
};
