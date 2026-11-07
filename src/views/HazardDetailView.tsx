import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  Guide3DPreview,
  GuideExamplesList,
  GuideSectionNav,
} from '../components/domain';
import {
  Badge,
  Button,
  Cluster,
  Datum,
  HazardBadge,
  Heading,
  Stack,
} from '../components/interface';
import {
  HAZARDS_GUIDE_PATH,
  extractFocusIdFromSearch,
  resolveHazardGuideEntries,
} from '../services/guideService';
import { useSpaLocation } from '../router';
import styles from './GuideViews.module.css';

export interface HazardDetailViewProps {
  readonly hazardId?: string;
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const extractHazardFromPathname = (pathname: string): string => {
  const match = /^\/guide\/hazards\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const HazardDetailView: React.FC<HazardDetailViewProps> = ({
  hazardId: propHazardId,
  locationPathname,
  locationSearch,
}) => {
  const { pathname, search } = useSpaLocation(
    locationPathname,
    locationSearch,
    '',
  );
  const resolvedHazardId =
    propHazardId ?? extractHazardFromPathname(pathname);
  const focusedEntityId = extractFocusIdFromSearch(search);

  const entries = useMemo(
    () => resolveHazardGuideEntries(resolvedHazardId),
    [resolvedHazardId],
  );

  const primaryEntry = entries[0];

  return (
    <main
      data-testid="hazard-detail-view-root"
      data-hazard-id={resolvedHazardId}
      className={styles.guideRoot}
    >
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Environmental Hazards', href: HAZARDS_GUIDE_PATH },
          { label: primaryEntry?.title || resolvedHazardId || 'Hazard' },
        ]}
      />
      <GuideSectionNav currentSection="hazards" />
      <Heading as="h1">
        {primaryEntry
          ? `Environmental Hazard: ${primaryEntry.title}`
          : resolvedHazardId
            ? `Environmental Hazard: ${resolvedHazardId}`
            : 'Environmental Hazard'}
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
        <Button href={HAZARDS_GUIDE_PATH} variant="subtle" size="sm" data-testid="hazards-list-link">
          All Environmental Hazards
        </Button>
      </p>

      {entries.length > 0 ? (
        <>
          {entries.map((entry) => (
            <section key={entry.id} className={styles.cardItem}>
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

              <Heading as="h3">Hazard Parameters & Operational Impact</Heading>
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

              <GuideExamplesList examples={entry.examples} />
            </section>
          ))}
        </>
      ) : (
        <section className={styles.cardItem}>
          <p data-testid="hazard-detail-fallback">
            Hazard details not found for &quot;{resolvedHazardId}&quot;.
          </p>
        </section>
      )}
    </main>
  );
};
