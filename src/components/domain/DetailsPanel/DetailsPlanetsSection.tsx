import {
  buildSystemElementFocusHref,
  type FocusedPlanetDetail,
} from '../../../services/detailsService';
import {
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import {
  CelestialBadge,
  CelestialTitle,
  Cluster,
  DataTable,
  Heading,
  Quantity,
  Unit,
} from '../../interface';

export interface DetailsPlanetsSectionProps {
  readonly planets?: readonly FocusedPlanetDetail[];
  readonly systemNameOrId: string;
}

export const DetailsPlanetsSection = ({
  planets = [],
  systemNameOrId,
}: DetailsPlanetsSectionProps) => {
  if (planets.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-planets-heading"
      data-testid="details-planets-section"
    >
      <Heading as="h4" size="eyebrow" id="details-planets-heading">
        Planets
      </Heading>
      <DataTable data-testid="details-planets-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Planet</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">a</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">P</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Mass</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Temp</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {planets.map((planet) => (
            <DataTable.Row
              key={planet.id}
              data-testid="details-planet-item"
              data-planet-id={planet.id}
              data-composition={planet.composition}
            >
              <DataTable.Cell>
                <Cluster gap="tight" align="center">
                  <CelestialTitle
                    type={planet.composition}
                    title={planet.name}
                    href={
                      planet.href ??
                      buildSystemElementFocusHref(
                        systemNameOrId,
                        planet.name || planet.id,
                      )
                    }
                    titleTestId="details-planet-name-link"
                    symbolHref={buildPlanetTypeGuideHref(planet.composition)}
                    symbolTestId="details-planet-type-link"
                  />
                  {planet.isHabitableCandidate ? (
                    <CelestialBadge
                      type="habitable-zone"
                      href={buildTagGalaxyHref('HabitableCandidate')}
                      data-testid="details-planet-habitable-link"
                    />
                  ) : null}
                </Cluster>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.semiMajorAxisAu !== undefined ? (
                  <Quantity
                    value={planet.semiMajorAxisAu}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('semi-major-axis', planet.id)}
                          data-testid="details-metric-unit-link"
                        >
                          AU
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.periodDays !== undefined ? (
                  <Quantity
                    value={planet.periodDays}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('orbital-period', planet.id)}
                          data-testid="details-metric-unit-link"
                        >
                          d
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.massMearth !== undefined ? (
                  <Quantity
                    value={planet.massMearth}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('planetary-mass', planet.id)}
                          data-testid="details-metric-unit-link"
                        >
                          M⊕
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.equilibriumTempK !== undefined ? (
                  <Quantity
                    value={planet.equilibriumTempK}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref(
                            'equilibrium-temperature',
                            planet.id,
                          )}
                          data-testid="details-metric-unit-link"
                        >
                          K
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};
