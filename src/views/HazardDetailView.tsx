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
  Datum,
  Heading,
  Stack,
} from '../components/interface';
import {
  HAZARDS_GUIDE_PATH,
  resolveHazardGuideEntry,
} from '../services/guideService';
import { useSpaLocation } from '../router';
import styles from './GuideViews.module.css';

export interface HazardDetailViewProps {
  readonly hazardId?: string;
  readonly locationPathname?: string;
}

const extractHazardFromPathname = (pathname: string): string => {
  const match = /^\/guide\/hazards\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const HazardDetailView: React.FC<HazardDetailViewProps> = ({
  hazardId: propHazardId,
  locationPathname,
}) => {
  const { pathname } = useSpaLocation(locationPathname, undefined, '');
  const resolvedHazardId =
    propHazardId ?? extractHazardFromPathname(pathname);

  const entry = useMemo(
    () => resolveHazardGuideEntry(resolvedHazardId),
    [resolvedHazardId],
  );

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
          { label: entry?.title || resolvedHazardId || 'Hazard' },
        ]}
      />
      <GuideSectionNav currentSection="hazards" />
      <Heading as="h1">{entry ? `Environmental Hazard: ${entry.title}` : 'Environmental Hazard'}</Heading>
      <p>
        <Button href={HAZARDS_GUIDE_PATH} variant="subtle" size="sm" data-testid="hazards-list-link">
          All Environmental Hazards
        </Button>
      </p>

      {entry ? (
        <>
          <section className={styles.cardItem}>
            <Guide3DPreview
              kind="hazard"
              hazardId={entry.id}
              domain={entry.domain}
              severity={entry.severity}
              isDetail
            />

            <div>
              <Badge status={entry.severity === 'critical' ? 'critical' : 'caution'}>
                {entry.title}
              </Badge>{' '}
              <Badge status="neutral">{entry.domainLabel}</Badge>
            </div>

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
          </section>

          <GuideExamplesList examples={entry.examples} />
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
