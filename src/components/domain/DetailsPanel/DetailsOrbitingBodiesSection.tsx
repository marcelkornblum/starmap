import { memo } from 'react';
import type { SystemElementBodyItem } from '../../../services/details/detailsHierarchyTypes';
import { CelestialTitle, CollapsibleSection, DataTable } from '../../interface';

interface DetailsOrbitingBodyRowProps {
  readonly body: SystemElementBodyItem;
}

const areOrbitingRowsEqual = (
  prev: DetailsOrbitingBodyRowProps,
  next: DetailsOrbitingBodyRowProps,
): boolean =>
  prev.body.id === next.body.id &&
  prev.body.name === next.body.name &&
  prev.body.href === next.body.href &&
  prev.body.categoryKey === next.body.categoryKey;

const DetailsOrbitingBodyRow = memo(function DetailsOrbitingBodyRow({
  body,
}: DetailsOrbitingBodyRowProps) {
  return (
    <DataTable.Row
      data-testid="details-orbiting-body-item"
      data-body-id={body.id}
    >
      <DataTable.Cell>
        <CelestialTitle
          type={
            body.categoryKey === 'spacecraft'
              ? 'construct'
              : (body.categoryKey ?? 'asteroid')
          }
          title={body.name}
          href={body.href}
          showTooltip={false}
          titleTestId="details-orbiting-body-link"
        />
      </DataTable.Cell>
    </DataTable.Row>
  );
}, areOrbitingRowsEqual);

export interface DetailsOrbitingBodiesSectionProps {
  readonly focusedKind: string;
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
}

export const DetailsOrbitingBodiesSection = memo(function DetailsOrbitingBodiesSection({
  focusedKind,
  orbitingBodies,
}: DetailsOrbitingBodiesSectionProps) {
  if (
    (focusedKind !== 'planet' &&
      focusedKind !== 'minor-body' &&
      focusedKind !== 'belt') ||
    !orbitingBodies ||
    orbitingBodies.length === 0
  ) {
    return null;
  }

  const heading = focusedKind === 'belt' ? 'Resident Bodies' : 'Orbiting Bodies';

  return (
    <CollapsibleSection
      title={heading}
      headingId="details-orbiting-bodies-heading"
      data-testid="details-orbiting-bodies-section"
    >
      <DataTable data-testid="details-orbiting-bodies-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Body</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {orbitingBodies.map((body) => (
            <DetailsOrbitingBodyRow key={body.id} body={body} />
          ))}
        </DataTable.Body>
      </DataTable>
    </CollapsibleSection>
  );
});

DetailsOrbitingBodiesSection.displayName = 'DetailsOrbitingBodiesSection';
