import {
  buildSystemElementFocusHref,
  type SystemElementsSummary,
} from '../../../services/detailsService';
import {
  buildCanonLayerGalaxyHref,
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import { Badge, Quantity, Unit } from '../../interface/information';
import { shouldDisplaySpectralBadge } from '../SearchResultItem/SearchResultItem';

export interface SystemElementsPanelProps {
  readonly elements: SystemElementsSummary | null;
}

/**
 * Domain Component (`<SystemElementsPanel>`): accepts a single `SystemElementsSummary | null`
 * domain property (`elements`) and renders all entities and annotations in the star system
 * broken into structured sections (`Stars`, `Planets`, `Moons & Dwarf Planets`,
 * `Minor Bodies & Spacecraft`, `Canon Layers`).
 */
export const SystemElementsPanel = ({ elements }: SystemElementsPanelProps) => {
  if (!elements) {
    return null;
  }

  const {
    systemId,
    systemName,
    focusedEntityId,
    stars,
    planets,
    moonsAndDwarfPlanets,
    minorBodiesAndSpacecraft,
    canonAnnotations,
  } = elements;

  return (
    <section
      aria-labelledby="system-elements-panel-heading"
      data-testid="system-elements-panel"
      data-system-id={systemId}
    >
      <h2 id="system-elements-panel-heading">System Elements</h2>

      <section
        aria-labelledby="system-elements-stars-heading"
        data-testid="system-elements-stars-section"
      >
        <h3 id="system-elements-stars-heading">Stars</h3>
        {stars.length > 0 ? (
          <ul data-testid="system-elements-stars-list">
            {stars.map((star) => (
              <li
                key={star.id}
                data-testid="system-elements-star-item"
                data-star-id={star.id}
                data-focused={focusedEntityId === star.id ? 'true' : undefined}
              >
                <a
                  href={
                    star.href ??
                    buildSystemElementFocusHref(
                      systemName || systemId,
                      star.name || star.id,
                    )
                  }
                  data-testid="system-elements-star-link"
                >
                  {star.name}
                </a>
                {` (Component ${star.componentDesignation}, `}
                {shouldDisplaySpectralBadge(star.spectralType) ? (
                  <Badge category="star">
                    <a
                      href={buildStarTypeGuideHref(star.spectralType)}
                      data-testid="system-elements-star-spectral-link"
                    >
                      {star.spectralType}
                    </a>
                  </Badge>
                ) : (
                  star.spectralType
                )}
                {', '}
                <Quantity
                  value={star.mag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude')}
                        data-testid="system-elements-metric-unit-link"
                      >
                        V
                      </a>
                    </Unit>
                  }
                />
                {', '}
                <Quantity
                  value={star.absmag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude')}
                        data-testid="system-elements-metric-unit-link"
                      >
                        M_V
                      </a>
                    </Unit>
                  }
                />
                {')'}
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="system-elements-stars-empty">No catalogued stars</p>
        )}
      </section>

      <section
        aria-labelledby="system-elements-planets-heading"
        data-testid="system-elements-planets-section"
      >
        <h3 id="system-elements-planets-heading">Planets</h3>
        {planets.length > 0 ? (
          <ul data-testid="system-elements-planets-list">
            {planets.map((planet) => (
              <li
                key={planet.id}
                data-testid="system-elements-planet-item"
                data-planet-id={planet.id}
                data-composition={planet.composition}
                data-focused={
                  focusedEntityId === planet.id ? 'true' : undefined
                }
              >
                <a
                  href={
                    planet.href ??
                    buildSystemElementFocusHref(
                      systemName || systemId,
                      planet.name || planet.id,
                    )
                  }
                  data-testid="system-elements-planet-link"
                >
                  {planet.name}
                </a>
                {' '}
                <Badge category="planet">
                  <a
                    href={buildPlanetTypeGuideHref(planet.composition)}
                    data-testid="system-elements-planet-type-link"
                  >
                    {planet.composition}
                  </a>
                </Badge>
                {planet.isHabitableCandidate ? (
                  <>
                    {' '}
                    <Badge status="nominal">
                      <a
                        href={buildTagGalaxyHref('HabitableCandidate')}
                        data-testid="system-elements-planet-habitable-link"
                      >
                        Habitable zone
                      </a>
                    </Badge>
                  </>
                ) : null}
                {planet.semiMajorAxisAu !== undefined ? (
                  <>
                    {' · a = '}
                    <Quantity
                      value={planet.semiMajorAxisAu}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('semi-major-axis')}
                            data-testid="system-elements-metric-unit-link"
                          >
                            AU
                          </a>
                        </Unit>
                      }
                    />
                  </>
                ) : null}
                {planet.periodDays !== undefined ? (
                  <>
                    {' · P = '}
                    <Quantity
                      value={planet.periodDays}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('orbital-period')}
                            data-testid="system-elements-metric-unit-link"
                          >
                            d
                          </a>
                        </Unit>
                      }
                    />
                  </>
                ) : null}
                {planet.massMearth !== undefined ? (
                  <>
                    {' · '}
                    <Quantity
                      value={planet.massMearth}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('planetary-mass')}
                            data-testid="system-elements-metric-unit-link"
                          >
                            M⊕
                          </a>
                        </Unit>
                      }
                    />
                  </>
                ) : null}
                {planet.equilibriumTempK !== undefined ? (
                  <>
                    {' · '}
                    <Quantity
                      value={planet.equilibriumTempK}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref(
                              'equilibrium-temperature',
                            )}
                            data-testid="system-elements-metric-unit-link"
                          >
                            K
                          </a>
                        </Unit>
                      }
                    />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="system-elements-planets-empty">
            No confirmed planets catalogued
          </p>
        )}
      </section>

      {moonsAndDwarfPlanets.length > 0 ? (
        <section
          aria-labelledby="system-elements-moons-heading"
          data-testid="system-elements-moons-section"
        >
          <h3 id="system-elements-moons-heading">Moons &amp; Dwarf Planets</h3>
          <ul data-testid="system-elements-moons-list">
            {moonsAndDwarfPlanets.map((body) => (
              <li
                key={body.id}
                data-testid="system-elements-moon-item"
                data-body-id={body.id}
                data-focused={focusedEntityId === body.id ? 'true' : undefined}
              >
                <a
                  href={body.href}
                  data-testid="system-elements-moon-link"
                >
                  {body.name}
                </a>
                {' '}
                <Badge status="neutral">{body.categoryLabel}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {minorBodiesAndSpacecraft.length > 0 ? (
        <section
          aria-labelledby="system-elements-minor-bodies-heading"
          data-testid="system-elements-minor-bodies-section"
        >
          <h3 id="system-elements-minor-bodies-heading">
            Minor Bodies &amp; Spacecraft
          </h3>
          <ul data-testid="system-elements-minor-bodies-list">
            {minorBodiesAndSpacecraft.map((body) => (
              <li
                key={body.id}
                data-testid="system-elements-minor-body-item"
                data-body-id={body.id}
                data-focused={focusedEntityId === body.id ? 'true' : undefined}
              >
                <a
                  href={body.href}
                  data-testid="system-elements-minor-body-link"
                >
                  {body.name}
                </a>
                {' '}
                <Badge status="neutral">{body.categoryLabel}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canonAnnotations.length > 0 ? (
        <section
          aria-labelledby="system-elements-canon-heading"
          data-testid="system-elements-canon-section"
        >
          <h3 id="system-elements-canon-heading">Canon Layers</h3>
          <ul data-testid="system-elements-canon-list">
            {canonAnnotations.map((annotation) => (
              <li
                key={`${annotation.layerId}:${annotation.targetId}`}
                data-testid="system-elements-canon-item"
                data-layer-id={annotation.layerId}
              >
                {annotation.inUniverseName ? (
                  <>
                    <strong data-testid="system-elements-canon-item-title">
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
                    data-testid="system-elements-canon-link"
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
