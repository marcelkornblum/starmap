import {
  buildPlanetDetailsHref,
  type PlanetaryElementsSummary,
} from '../../../services/detailsService';
import {
  buildCanonLayerGalaxyHref,
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import { Badge, Quantity, Unit } from '../../interface/information';

export interface PlanetaryElementsPanelProps {
  readonly elements: PlanetaryElementsSummary | null;
}

/**
 * Domain Component (`<PlanetaryElementsPanel>`): accepts a single `PlanetaryElementsSummary | null`
 * domain property (`elements`) and renders the host planet and all catalogued orbital bodies
 * and annotations broken into structured sections (`Planet`, `Moons`, `Minor Bodies & Spacecraft`,
 * `Canon Layers`).
 */
export const PlanetaryElementsPanel = ({
  elements,
}: PlanetaryElementsPanelProps) => {
  if (!elements) {
    return null;
  }

  const {
    planetId,
    planetName,
    planetHref,
    systemId,
    focusedEntityId,
    planetDetail,
    moons,
    minorBodiesAndSpacecraft,
    canonAnnotations,
  } = elements;

  return (
    <section
      aria-labelledby="planetary-elements-panel-heading"
      data-testid="planetary-elements-panel"
      data-planet-id={planetId}
      data-system-id={systemId}
    >
      <h2 id="planetary-elements-panel-heading">Orbital Bodies</h2>

      <section
        aria-labelledby="planetary-elements-planet-heading"
        data-testid="planetary-elements-planet-section"
      >
        <h3 id="planetary-elements-planet-heading">Planet</h3>
        {planetDetail ? (
          <ul data-testid="planetary-elements-planet-list">
            <li
              data-testid="planetary-elements-planet-item"
              data-planet-id={planetDetail.id}
              data-composition={planetDetail.composition}
              data-focused={
                focusedEntityId === planetDetail.id ? 'true' : undefined
              }
            >
              <a
                href={
                  planetDetail.href ??
                  planetHref ??
                  buildPlanetDetailsHref(planetName || planetId)
                }
                data-testid="planetary-elements-planet-link"
              >
                {planetDetail.name}
              </a>{' '}
              <Badge category="planet">
                <a
                  href={buildPlanetTypeGuideHref(planetDetail.composition)}
                  data-testid="planetary-elements-planet-type-link"
                >
                  {planetDetail.composition}
                </a>
              </Badge>
              {planetDetail.isHabitableCandidate ? (
                <>
                  {' '}
                  <Badge status="nominal">
                    <a
                      href={buildTagGalaxyHref('HabitableCandidate')}
                      data-testid="planetary-elements-planet-habitable-link"
                    >
                      Habitable zone
                    </a>
                  </Badge>
                </>
              ) : null}
              {planetDetail.semiMajorAxisAu !== undefined ? (
                <>
                  {' · a = '}
                  <Quantity
                    value={planetDetail.semiMajorAxisAu}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('semi-major-axis')}
                          data-testid="planetary-elements-metric-unit-link"
                        >
                          AU
                        </a>
                      </Unit>
                    }
                  />
                </>
              ) : null}
              {planetDetail.periodDays !== undefined ? (
                <>
                  {' · P = '}
                  <Quantity
                    value={planetDetail.periodDays}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('orbital-period')}
                          data-testid="planetary-elements-metric-unit-link"
                        >
                          d
                        </a>
                      </Unit>
                    }
                  />
                </>
              ) : null}
              {planetDetail.massMearth !== undefined ? (
                <>
                  {' · '}
                  <Quantity
                    value={planetDetail.massMearth}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('planetary-mass')}
                          data-testid="planetary-elements-metric-unit-link"
                        >
                          M⊕
                        </a>
                      </Unit>
                    }
                  />
                </>
              ) : null}
              {planetDetail.equilibriumTempK !== undefined ? (
                <>
                  {' · '}
                  <Quantity
                    value={planetDetail.equilibriumTempK}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('equilibrium-temperature')}
                          data-testid="planetary-elements-metric-unit-link"
                        >
                          K
                        </a>
                      </Unit>
                    }
                  />
                </>
              ) : null}
            </li>
          </ul>
        ) : (
          <p data-testid="planetary-elements-planet-fallback">
            <a
              href={planetHref || buildPlanetDetailsHref(planetName || planetId)}
              data-testid="planetary-elements-planet-link"
            >
              {planetName}
            </a>
          </p>
        )}
      </section>

      <section
        aria-labelledby="planetary-elements-moons-heading"
        data-testid="planetary-elements-moons-section"
      >
        <h3 id="planetary-elements-moons-heading">Moons</h3>
        {moons.length > 0 ? (
          <ul data-testid="planetary-elements-moons-list">
            {moons.map((body) => (
              <li
                key={body.id}
                data-testid="planetary-elements-moon-item"
                data-body-id={body.id}
                data-focused={focusedEntityId === body.id ? 'true' : undefined}
              >
                <a
                  href={body.href}
                  data-testid="planetary-elements-moon-link"
                >
                  {body.name}
                </a>{' '}
                <Badge status="neutral">{body.categoryLabel}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="planetary-elements-moons-empty">
            No catalogued moons in orbit
          </p>
        )}
      </section>

      {minorBodiesAndSpacecraft.length > 0 ? (
        <section
          aria-labelledby="planetary-elements-minor-bodies-heading"
          data-testid="planetary-elements-minor-bodies-section"
        >
          <h3 id="planetary-elements-minor-bodies-heading">
            Minor Bodies &amp; Spacecraft
          </h3>
          <ul data-testid="planetary-elements-minor-bodies-list">
            {minorBodiesAndSpacecraft.map((body) => (
              <li
                key={body.id}
                data-testid="planetary-elements-minor-body-item"
                data-body-id={body.id}
                data-focused={focusedEntityId === body.id ? 'true' : undefined}
              >
                <a
                  href={body.href}
                  data-testid="planetary-elements-minor-body-link"
                >
                  {body.name}
                </a>{' '}
                <Badge status="neutral">{body.categoryLabel}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canonAnnotations.length > 0 ? (
        <section
          aria-labelledby="planetary-elements-canon-heading"
          data-testid="planetary-elements-canon-section"
        >
          <h3 id="planetary-elements-canon-heading">Canon Layers</h3>
          <ul data-testid="planetary-elements-canon-list">
            {canonAnnotations.map((annotation) => (
              <li
                key={`${annotation.layerId}:${annotation.targetId}`}
                data-testid="planetary-elements-canon-item"
                data-layer-id={annotation.layerId}
              >
                {annotation.inUniverseName ? (
                  <>
                    <strong data-testid="planetary-elements-canon-item-title">
                      {annotation.inUniverseName}
                    </strong>
                    {' — '}
                  </>
                ) : null}
                <Badge
                  status={
                    annotation.kind === 'scientific-overlay'
                      ? 'info'
                      : 'neutral'
                  }
                >
                  <a
                    href={
                      annotation.layerHref ||
                      buildCanonLayerGalaxyHref(annotation.layerId)
                    }
                    data-testid="planetary-elements-canon-link"
                  >
                    {annotation.layerTitle}
                  </a>
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
};
