import type React from 'react';
import { Breadcrumbs, Guide3DPreview, GuideSectionNav } from '../components/domain';
import { Badge, Cluster, Datum, Heading, Unit } from '../components/interface';
import { METRIC_GUIDE_ENTRIES } from '../services/guideService';
import styles from './GuideViews.module.css';

export const MetricsListView: React.FC = () => {
  return (
    <main data-testid="metrics-list-view-root" className={styles.guideRoot}>
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Telemetry Metrics' },
        ]}
      />
      <GuideSectionNav currentSection="metrics" />
      <Heading as="h1">Telemetry Metrics</Heading>
      <ul data-testid="metrics-guide-list" className={styles.cardList}>
        {METRIC_GUIDE_ENTRIES.map((entry) => (
          <li
            key={entry.id}
            data-testid="metrics-guide-item"
            data-metric-id={entry.id}
            className={styles.cardItem}
          >
            <a
              href={entry.href}
              data-testid="metrics-guide-link"
              className={styles.cardLink}
            >
              <Guide3DPreview
                kind="metric"
                metricId={entry.id}
                unit={entry.unitSymbol}
                baselineName={entry.comparisonBaselineLabel}
                baselineValue={entry.comparisonBaselineValue}
              />
              <Cluster gap="tight" align="center">
                <strong>{entry.title}</strong>
                <Unit inParens>{entry.unitSymbol}</Unit>
                <Badge status="neutral">{entry.category}</Badge>
              </Cluster>
              <Datum
                data-testid="metric-familiar-conversion"
                label="Familiar Scale"
                value={entry.familiarConversion}
              />
              <p>{entry.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
};
