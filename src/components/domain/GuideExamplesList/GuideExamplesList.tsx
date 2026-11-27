import type React from 'react';
import {
  CelestialTitle,
  CollapsibleSection,
  DataTable,
  type CelestialSymbolType,
} from '../../interface';
import type { GuideExampleTarget } from '../../../content/guide';
import styles from './GuideExamplesList.module.css';

export interface GuideExamplesListProps {
  readonly examples: readonly GuideExampleTarget[];
  readonly title?: string;
  readonly reticleType?: CelestialSymbolType;
}

export const GuideExamplesList: React.FC<GuideExamplesListProps> = ({
  examples,
  title = 'Canonical System Benchmarks',
  reticleType,
}) => {
  return (
    <div className={styles.cardItem}>
      <CollapsibleSection title={title} headingAs="h3">
        <DataTable data-testid="guide-examples-list">
          <DataTable.Head>
            <DataTable.Row>
              <DataTable.HeaderCell>Benchmark</DataTable.HeaderCell>
              <DataTable.HeaderCell>Context</DataTable.HeaderCell>
            </DataTable.Row>
          </DataTable.Head>
          <DataTable.Body>
            {examples.map((ex) => (
              <DataTable.Row key={ex.name} data-testid="guide-example-item">
                <DataTable.Cell>
                  <CelestialTitle
                    type={ex.reticleType ?? reticleType ?? 'star'}
                    title={ex.name}
                    href={ex.href}
                    titleTestId="guide-example-link"
                    showTooltip={false}
                  />
                </DataTable.Cell>
                <DataTable.Cell>{ex.note}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable.Body>
        </DataTable>
      </CollapsibleSection>
    </div>
  );
};
