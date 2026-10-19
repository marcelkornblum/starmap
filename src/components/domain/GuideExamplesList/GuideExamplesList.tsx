import type React from 'react';
import type { GuideExampleTarget } from '../../../services/guideService';
import styles from './GuideExamplesList.module.css';

export interface GuideExamplesListProps {
  readonly examples: readonly GuideExampleTarget[];
  readonly title?: string;
}

export const GuideExamplesList: React.FC<GuideExamplesListProps> = ({
  examples,
  title = 'Canonical System Benchmarks',
}) => {
  return (
    <section className={styles.cardItem}>
      <h3>{title}</h3>
      <ul data-testid="guide-examples-list" className={styles.examplesList}>
        {examples.map((ex) => (
          <li
            key={ex.name}
            data-testid="guide-example-item"
            className={styles.exampleItem}
          >
            <a href={ex.href} data-testid="guide-example-link">
              {ex.name}
            </a>{' '}
            — {ex.note}
          </li>
        ))}
      </ul>
    </section>
  );
};
