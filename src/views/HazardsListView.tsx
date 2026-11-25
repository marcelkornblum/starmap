import type React from 'react';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { Guide3DPreview } from '../components/domain/Guide3DPreview';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { Badge, Block, Cluster, Datum, Grid, HazardBadge, Heading } from '../components/interface';
import { HAZARD_GUIDE_ENTRIES } from '../content/guide';
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
      <Grid as="ul" minWidth="md" gap="default" data-testid="hazards-guide-list">
        {HAZARD_GUIDE_ENTRIES.map((entry) => (
          <Block
            as="li"
            interactive
            padding="loose"
            key={entry.id}
            data-testid="hazards-guide-item"
            data-hazard-id={entry.id}
            data-hazard-domain={entry.domain}
            data-hazard-severity={entry.severity}
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
                <HazardBadge
                  code={entry.id}
                  label={entry.title}
                  severity={entry.severity}
                />
                <Badge status="neutral">{entry.domainLabel}</Badge>
              </Cluster>
              <Datum label="Trigger Threshold" value={entry.thresholdCriteria} />
              <p>{entry.summary}</p>
            </a>
          </Block>
        ))}
      </Grid>
    </main>
  );
};
