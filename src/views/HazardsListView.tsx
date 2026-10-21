import type React from 'react';
import { Breadcrumbs, Guide3DPreview, GuideSectionNav } from '../components/domain';
import { Badge, Cluster, Datum, Heading } from '../components/interface';
import { HAZARD_GUIDE_ENTRIES } from '../services/guideService';
import styles from './GuideViews.module.css';

export const HazardsListView: React.FC = () => {
  return (
    <main data-testid="hazards-list-view-root" className={styles.guideRoot}>
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Environmental Hazards' },
        ]}
      />
      <GuideSectionNav currentSection="hazards" />
      <Heading as="h1">Environmental Hazards</Heading>
      <ul data-testid="hazards-guide-list" className={styles.cardList}>
        {HAZARD_GUIDE_ENTRIES.map((entry) => (
          <li
            key={entry.id}
            data-testid="hazards-guide-item"
            data-hazard-id={entry.id}
            data-hazard-domain={entry.domain}
            data-hazard-severity={entry.severity}
            className={styles.cardItem}
          >
            <a
              href={entry.href}
              data-testid="hazards-guide-link"
              className={styles.cardLink}
            >
              <Guide3DPreview
                kind="hazard"
                hazardId={entry.id}
                domain={entry.domain}
                severity={entry.severity}
              />
              <Cluster gap="tight" align="center">
                <Badge status={entry.severity === 'critical' ? 'critical' : 'caution'}>
                  {entry.title}
                </Badge>
                <Badge status="neutral">{entry.domainLabel}</Badge>
              </Cluster>
              <Datum label="Trigger Threshold" value={entry.thresholdCriteria} />
              <p>{entry.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
};
