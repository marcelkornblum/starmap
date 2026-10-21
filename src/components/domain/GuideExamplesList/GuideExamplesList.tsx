import type React from 'react';
import { DataTable, Heading } from '../../interface';
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
      <Heading as="h3">{title}</Heading>
      <DataTable data-testid="guide-examples-list" className={styles.examplesList}>
        <DataTable.Head>
          <DataTable.HeaderCell>Benchmark</DataTable.HeaderCell>
          <DataTable.HeaderCell>Context</DataTable.HeaderCell>
        </DataTable.Head>
        <DataTable.Body>
          {examples.map((ex) => (
            <DataTable.Row key={ex.name} data-testid="guide-example-item">
              <DataTable.Cell>
                <a href={ex.href} data-testid="guide-example-link">
                  {ex.name}
                </a>
              </DataTable.Cell>
              <DataTable.Cell>{ex.note}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};
