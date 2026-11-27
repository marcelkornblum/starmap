import React, { useMemo } from 'react';
import { Guide3DPreview } from '../components/domain/Guide3DPreview';
import { GuideExamplesList } from '../components/domain/GuideExamplesList';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { SpatialShell } from '../components/domain/SpatialShell';
import {
  Badge,
  Block,
  Button,
  Cluster,
  CollapsibleSection,
  Datum,
  HazardBadge,
  Heading,
  Stack,
} from '../components/interface';
import { extractFocusIdFromSearch } from '../services/guide/guideNavigation';
import {
  getGuideExamplesForEntry,
  resolveHazardGuideEntries,
} from '../services/guide/guideCatalogExamples';
import { useHydratedGuideExamples } from '../hooks/useGuideData';
import { useParams } from '@tanstack/react-router';
import { useSpaLocation } from '../hooks/useSpaLocation';
import styles from './GuideViews.module.css';

export interface HazardDetailViewProps {
  readonly hazardId?: string;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

export const HazardDetailView: React.FC<HazardDetailViewProps> = ({
  hazardId: propHazardId,
  locationPathname,
  locationSearch,
}) => {
  const routeParams = useParams({ strict: false }) as Record<string, string | undefined> | undefined;
  const { search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '',
  );
  const resolvedHazardId =
    routeParams?.hazardId ?? propHazardId ?? '';
  const focusedEntityId = extractFocusIdFromSearch(search);

  useHydratedGuideExamples();

  const entries = useMemo(
    () => resolveHazardGuideEntries(resolvedHazardId),
    [resolvedHazardId],
  );

  const primaryEntry = entries[0];

  const companionMapHref = focusedEntityId
    ? `/galaxy?focus=${encodeURIComponent(focusedEntityId)}`
    : undefined;

  return (
    <SpatialShell
      mode="document"
      testId="hazard-detail-view-root"
      activeWorkspace="guide"
      companionMapHref={companionMapHref}
      data-hazard-id={resolvedHazardId}
    >
      <div className={styles.guideRoot}>
      <GuideSectionNav currentSection="hazards" />
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
        {primaryEntry
          ? `Environmental Hazard: ${primaryEntry.title}`
          : resolvedHazardId
            ? `Environmental Hazard: ${resolvedHazardId}`
            : 'Environmental Hazard'}
      </Heading>

      {entries.length > 0 ? (
        <>
          {entries.map((entry) => (
            <Block as="section" padding="default" key={entry.id}>
              <Stack gap="fib-3">
                <Guide3DPreview
                  kind="hazard"
                  hazardId={entry.id}
                  domain={entry.domain}
                  severity={entry.severity}
                  isDetail
                />

                <Cluster gap="tight" align="center">
                  <HazardBadge
                    code={entry.id}
                    label={entry.title}
                    severity={entry.severity}
                  />
                  <Badge status="neutral">{entry.domainLabel}</Badge>
                </Cluster>

                <p data-testid="guide-detail-summary">{entry.summary}</p>

                <CollapsibleSection title="Hazard Parameters & Operational Impact" headingAs="h3">
                  <Stack gap="none" data-testid="guide-detail-telemetry">
                    <Datum label="Scope" value={entry.domainLabel} />
                    <Datum
                      label="Severity Tier"
                      value={entry.severity === 'critical'
                        ? 'Critical Hazard'
                        : 'Operational Warning'}
                    />
                    <Datum label="Trigger Threshold" value={entry.thresholdCriteria} />
                    <Datum label="Physical Mechanism" value={entry.physicalMechanism} />
                    <Datum label="Operational Impact" value={entry.operationalImpact} />
                    <Datum label="Mitigation" value={entry.mitigationNotes} />
                  </Stack>
                </CollapsibleSection>

                <GuideExamplesList
                  examples={getGuideExamplesForEntry('hazardTypes', entry.id)}
                />
              </Stack>
            </Block>
          ))}
        </>
      ) : (
        <Block as="section" padding="default">
          <p data-testid="hazard-detail-fallback">
            Hazard details not found for &quot;{resolvedHazardId}&quot;.
          </p>
        </Block>
      )}
      </div>
    </SpatialShell>
  );
};
