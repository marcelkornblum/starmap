import type { SystemElementBodyItem } from '../../../services/detailsService';
import { CelestialTitle, DataTable, Heading } from '../../interface';

export interface DetailsOrbitingBodiesSectionProps {
  readonly focusedKind: string;
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
}

export const DetailsOrbitingBodiesSection = ({
  focusedKind,
  orbitingBodies,
}: DetailsOrbitingBodiesSectionProps) => {
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
    <section
      aria-labelledby="details-orbiting-bodies-heading"
      data-testid="details-orbiting-bodies-section"
    >
      <Heading as="h4" size="eyebrow" id="details-orbiting-bodies-heading">
        {heading}
      </Heading>
      <DataTable data-testid="details-orbiting-bodies-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Body</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {orbitingBodies.map((body) => (
            <DataTable.Row
              key={body.id}
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
                  titleTestId="details-orbiting-body-link"
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};
