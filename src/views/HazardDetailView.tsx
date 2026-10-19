import React, { useMemo } from 'react';
import {
  Breadcrumbs,
  Guide3DPreview,
  GuideExamplesList,
  GuideSectionNav,
} from '../components/domain';
import { Badge } from '../components/interface';
import {
  HAZARDS_GUIDE_PATH,
  resolveHazardGuideEntry,
} from '../services/guideService';
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
  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
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
      <h1>{entry ? `Environmental Hazard: ${entry.title}` : 'Environmental Hazard'}</h1>
      <p>
        <a href={HAZARDS_GUIDE_PATH} data-testid="hazards-list-link">
          All Environmental Hazards
        </a>
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

            <h3>Hazard Parameters & Operational Impact</h3>
            <dl data-testid="guide-detail-telemetry" className={styles.telemetryDl}>
              <dt>Scope</dt>
              <dd>{entry.domainLabel}</dd>
              <dt>Severity Tier</dt>
              <dd>
                {entry.severity === 'critical'
                  ? 'Critical Hazard'
                  : 'Operational Warning'}
              </dd>
              <dt>Trigger Threshold</dt>
              <dd>{entry.thresholdCriteria}</dd>
              <dt>Physical Mechanism</dt>
              <dd>{entry.physicalMechanism}</dd>
              <dt>Operational Impact</dt>
              <dd>{entry.operationalImpact}</dd>
              <dt>Mitigation</dt>
              <dd>{entry.mitigationNotes}</dd>
            </dl>
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
