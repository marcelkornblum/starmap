import type React from 'react';
import { Breadcrumbs, Guide3DPreview, GuideSectionNav } from '../components/domain';
import { Badge, Unit } from '../components/interface';
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
      <h1>Telemetry Metrics</h1>
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
              <div>
                <strong>{entry.title}</strong>{' '}
                <Unit inParens>{entry.unitSymbol}</Unit>{' '}
                <Badge status="neutral">{entry.category}</Badge>
              </div>
              <p
                data-testid="metric-familiar-conversion"
                className={styles.familiarConversion}
              >
                {entry.familiarConversion}
              </p>
              <p>{entry.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
};
