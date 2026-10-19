import { Fragment, type ReactNode } from 'react';
import {
  buildSystemElementFocusHref,
  type FocusedCanonAnnotation,
  type FocusedEntityDetails,
  type FocusedPlanetDetail,
  type FocusedStarDetail,
  type PlanetCompositionCount,
  type SystemElementBodyItem,
  type SystemSummarySegment,
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

export interface DetailsPanelProps {
  readonly details: FocusedEntityDetails | null;
}

const renderPlanetComposition = (
  planetCount: number,
  breakdown: readonly PlanetCompositionCount[],
  hasHabitableCandidate: boolean,
): ReactNode => {
  if (planetCount <= 0) {
    return '0 confirmed planets';
  }

  const countLabel = `${planetCount} ${planetCount === 1 ? 'planet' : 'planets'} (`;
  const hasNumericCounts = breakdown.some((b) => b.count !== undefined);
  const separator = hasNumericCounts ? ' · ' : ', ';

  return (
    <>
      {countLabel}
      {breakdown.map((item, idx) => (
        <Fragment key={`${item.composition}-${idx}`}>
          {idx > 0 ? separator : null}
          {item.count !== undefined ? `${item.count} ` : null}
          <Badge category="planet">
            <a
              href={buildPlanetTypeGuideHref(item.composition)}
              data-testid="details-summary-planet-type-link"
            >
              {item.composition}
            </a>
          </Badge>
        </Fragment>
      ))}
      {hasHabitableCandidate ? (
        <>
          {breakdown.length > 0 ? ' · ' : null}
          <Badge status="nominal">
            <a
              href={buildTagGalaxyHref('HabitableCandidate')}
              data-testid="details-habitable-zone-link"
            >
              Habitable zone candidate
            </a>
          </Badge>
        </>
      ) : null}
      {')'}
    </>
  );
};

const renderSystemSummarySegments = (
  segments: readonly SystemSummarySegment[],
): ReactNode =>
  segments.map((seg, idx) => {
    if (seg.kind === 'spectral-badge') {
      if (!shouldDisplaySpectralBadge(seg.spectralType)) {
        return <Fragment key={idx}>{seg.spectralType}</Fragment>;
      }
      return (
        <Badge key={idx} category="star">
          <a
            href={buildStarTypeGuideHref(seg.spectralType)}
            data-testid="details-summary-spectral-link"
          >
            {seg.spectralType}
          </a>
        </Badge>
      );
    }
    if (seg.kind === 'planet-type-badge') {
      return (
        <Badge key={idx} category="planet">
          <a
            href={buildPlanetTypeGuideHref(seg.composition)}
            data-testid="details-summary-planet-type-link"
          >
            {seg.composition}
          </a>
        </Badge>
      );
    }
    if (seg.kind === 'habitable-badge') {
      return (
        <Badge key={idx} status="nominal">
          <a
            href={buildTagGalaxyHref('HabitableCandidate')}
            data-testid="details-summary-habitable-link"
          >
            {seg.label}
          </a>
        </Badge>
      );
    }
    return <Fragment key={idx}>{seg.text}</Fragment>;
  });

const renderCanonLayers = (
  canonAnnotations: readonly FocusedCanonAnnotation[],
): ReactNode => {
  if (canonAnnotations.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-canon-heading"
      data-testid="details-canon-section"
    >
      <h4 id="details-canon-heading">Canon Layers</h4>
      <ul data-testid="details-canon-list">
        {canonAnnotations.map((annotation) => (
          <li
            key={`${annotation.layerId}:${annotation.targetId}`}
            data-testid="details-canon-item"
            data-layer-id={annotation.layerId}
            data-layer-kind={annotation.kind}
            data-target-id={annotation.targetId}
          >
            <details data-testid="details-canon-accordion">
              <summary data-testid="details-canon-summary">
                {annotation.inUniverseName ? (
                  <>
                    <strong data-testid="details-canon-item-title">
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
                    data-testid="details-canon-link"
                  >
                    {annotation.layerTitle}
                  </a>
                </Badge>
              </summary>
              <p data-testid="details-canon-text">{annotation.text}</p>
              {annotation.tags.length > 0 ? (
                <p data-testid="details-canon-tags">
                  {'Tags: '}
                  {annotation.tags.map((tag, index) => (
                    <Fragment key={tag}>
                      {index > 0 ? ' ' : null}
                      <Badge status="neutral">
                        <a
                          href={buildTagGalaxyHref(tag)}
                          data-testid="details-canon-tag-link"
                        >
                          {tag}
                        </a>
                      </Badge>
                    </Fragment>
                  ))}
                </p>
              ) : null}
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
};

const renderOrbitingBodies = (
  focusedKind: string,
  orbitingBodies?: readonly SystemElementBodyItem[],
): ReactNode => {
  if (
    (focusedKind !== 'planet' && focusedKind !== 'minor-body') ||
    !orbitingBodies ||
    orbitingBodies.length === 0
  ) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-orbiting-bodies-heading"
      data-testid="details-orbiting-bodies-section"
    >
      <h4 id="details-orbiting-bodies-heading">Orbiting Bodies</h4>
      <ul data-testid="details-orbiting-bodies-list">
        {orbitingBodies.map((body) => (
          <li
            key={body.id}
            data-testid="details-orbiting-body-item"
            data-body-id={body.id}
          >
            <a
              href={body.href}
              data-testid="details-orbiting-body-link"
            >
              {body.name}
            </a>{' '}
            <Badge status="neutral">{body.categoryLabel}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
};

const renderStars = (
  stars: readonly FocusedStarDetail[],
  systemNameOrId: string,
): ReactNode => {
  if (stars.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-stars-heading"
      data-testid="details-stars-section"
    >
      <h4 id="details-stars-heading">Stars</h4>
      <ul data-testid="details-stars-list">
        {stars.map((star) => (
          <li
            key={star.id}
            data-testid="details-star-item"
            data-star-id={star.id}
          >
            <a
              href={
                star.href ??
                buildSystemElementFocusHref(
                  systemNameOrId,
                  star.name || star.id,
                )
              }
              data-testid="details-star-name-link"
            >
              {star.name}
            </a>
            {' ('}
            {shouldDisplaySpectralBadge(star.spectralType) ? (
              <Badge category="star">
                <a
                  href={buildStarTypeGuideHref(star.spectralType)}
                  data-testid="details-star-spectral-link"
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
                    href={buildMetricGuideHref('stellar-magnitude', star.id)}
                    data-testid="details-metric-unit-link"
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
                    href={buildMetricGuideHref('stellar-magnitude', star.id)}
                    data-testid="details-metric-unit-link"
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
    </section>
  );
};

const renderPlanets = (
  planets: readonly FocusedPlanetDetail[],
  systemNameOrId: string,
): ReactNode => {
  if (planets.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-planets-heading"
      data-testid="details-planets-section"
    >
      <h4 id="details-planets-heading">Planets</h4>
      <ul data-testid="details-planets-list">
        {planets.map((planet) => (
          <li
            key={planet.id}
            data-testid="details-planet-item"
            data-planet-id={planet.id}
            data-composition={planet.composition}
          >
            <a
              href={
                planet.href ??
                buildSystemElementFocusHref(
                  systemNameOrId,
                  planet.name || planet.id,
                )
              }
              data-testid="details-planet-name-link"
            >
              {planet.name}
            </a>{' '}
            <Badge category="planet">
              <a
                href={buildPlanetTypeGuideHref(planet.composition)}
                data-testid="details-planet-type-link"
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
                    data-testid="details-planet-habitable-link"
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
                        href={buildMetricGuideHref('semi-major-axis', planet.id)}
                        data-testid="details-metric-unit-link"
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
                        href={buildMetricGuideHref('orbital-period', planet.id)}
                        data-testid="details-metric-unit-link"
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
                        href={buildMetricGuideHref('planetary-mass', planet.id)}
                        data-testid="details-metric-unit-link"
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
                          planet.id,
                        )}
                        data-testid="details-metric-unit-link"
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
    </section>
  );
};

/**
 * Domain Component (`<DetailsPanel>`): accepts a single `FocusedEntityDetails | null`
 * domain property (`details`), returns `null` when nothing is focused, and decomposes
 * the focused entity's data into the 3 detent areas (`Peek`, `Partial`, `Full`).
 */
export const DetailsPanel = ({ details }: DetailsPanelProps) => {
  if (!details) {
    return null;
  }

  const {
    id,
    systemId,
    name,
    systemName,
    focusedKind,
    spectralType,
    reticleType,
    starCount,
    planetCount,
    planetCompositionBreakdown,
    hasHabitableCandidate,
    systemSummarySegments,
    coordinatesPc,
    sectorId,
    tags,
    systemDetailsHref,
    starTelemetry,
    planetTelemetry,
    minorBodyTelemetry,
    structureTelemetry,
    stars,
    planets,
    orbitingBodies,
    canonAnnotations,
  } = details;

  const hasSpectBadge = shouldDisplaySpectralBadge(spectralType);
  const isSystemFocus = focusedKind === 'system';

  return (
    <section
      aria-labelledby="details-panel-heading"
      data-testid="details-panel"
      data-entity-id={id}
      data-system-id={systemId}
      data-focused-kind={focusedKind}
    >
      <h2 id="details-panel-heading">Details</h2>

      <section
        aria-labelledby="details-peek-heading"
        data-testid="details-detent-peek"
      >
        <h3 id="details-peek-heading">Peek</h3>
        <p data-testid="details-peek-header">
          <strong data-testid="details-peek-name">{name}</strong>
          {name !== systemName ? (
            <span data-testid="details-peek-system-name">
              {` (${systemName})`}
            </span>
          ) : null}{' '}
          <span data-testid="details-reticle-type">{`[${reticleType}]`}</span>
          {(isSystemFocus || focusedKind === 'star') && hasSpectBadge && spectralType ? (
            <>
              {' '}
              <Badge category="star">
                <a
                  href={buildStarTypeGuideHref(spectralType)}
                  data-testid="details-spectral-badge"
                >
                  {spectralType}
                </a>
              </Badge>
            </>
          ) : null}
          {isSystemFocus ? (
            <>
              {' · '}
              <span data-testid="details-star-count">
                {`${starCount} ${starCount === 1 ? 'star' : 'stars'}`}
              </span>
            </>
          ) : null}
        </p>
        {planetTelemetry ? (
          <p data-testid="details-focused-entity-peek">
            <Badge category="planet">
              <a
                href={buildPlanetTypeGuideHref(planetTelemetry.composition)}
                data-testid="details-focused-planet-type-link"
              >
                {planetTelemetry.composition}
              </a>
            </Badge>
            {planetTelemetry.isHabitableCandidate ? (
              <>
                {' '}
                <Badge status="nominal">
                  <a
                    href={buildTagGalaxyHref('HabitableCandidate')}
                    data-testid="details-focused-planet-habitable-link"
                  >
                    Habitable zone
                  </a>
                </Badge>
              </>
            ) : null}
            {planetTelemetry.semiMajorAxisAu !== undefined ? (
              <>
                {' · a = '}
                <Quantity
                  value={planetTelemetry.semiMajorAxisAu}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('semi-major-axis', id)}
                        data-testid="details-metric-unit-link"
                      >
                        AU
                      </a>
                    </Unit>
                  }
                />
              </>
            ) : null}
            {planetTelemetry.periodDays !== undefined ? (
              <>
                {' · P = '}
                <Quantity
                  value={planetTelemetry.periodDays}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('orbital-period', id)}
                        data-testid="details-metric-unit-link"
                      >
                        d
                      </a>
                    </Unit>
                  }
                />
              </>
            ) : null}
            {planetTelemetry.massMearth !== undefined ? (
              <>
                {' · '}
                <Quantity
                  value={planetTelemetry.massMearth}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('planetary-mass', id)}
                        data-testid="details-metric-unit-link"
                      >
                        M⊕
                      </a>
                    </Unit>
                  }
                />
              </>
            ) : null}
            {planetTelemetry.equilibriumTempK !== undefined ? (
              <>
                {' · '}
                <Quantity
                  value={planetTelemetry.equilibriumTempK}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('equilibrium-temperature', id)}
                        data-testid="details-metric-unit-link"
                      >
                        K
                      </a>
                    </Unit>
                  }
                />
              </>
            ) : null}
          </p>
        ) : null}
        {starTelemetry ? (
          <p data-testid="details-focused-entity-peek">
            {`Component ${starTelemetry.componentDesignation} · `}
            <Quantity
              value={starTelemetry.mag}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('stellar-magnitude', id)}
                    data-testid="details-metric-unit-link"
                  >
                    V
                  </a>
                </Unit>
              }
            />
            {' · '}
            <Quantity
              value={starTelemetry.absmag}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('stellar-magnitude', id)}
                    data-testid="details-metric-unit-link"
                  >
                    M_V
                  </a>
                </Unit>
              }
            />
          </p>
        ) : null}
        {minorBodyTelemetry ? (
          <p data-testid="details-focused-entity-peek">
            <Badge status="neutral">{minorBodyTelemetry.categoryLabel}</Badge>
            {minorBodyTelemetry.parentBodyName
              ? ` · ${minorBodyTelemetry.parentBodyName}`
              : null}
          </p>
        ) : null}
        {structureTelemetry ? (
          <p data-testid="details-focused-entity-peek">
            <Badge status="info">{structureTelemetry.structureType}</Badge>
          </p>
        ) : null}
        {isSystemFocus ? (
          <p data-testid="details-planet-composition">
            {renderPlanetComposition(
              planetCount,
              planetCompositionBreakdown,
              hasHabitableCandidate,
            )}
          </p>
        ) : null}
        <p data-testid="details-system-summary">
          {renderSystemSummarySegments(systemSummarySegments)}
        </p>
      </section>

      <section
        aria-labelledby="details-partial-heading"
        data-testid="details-detent-partial"
      >
        <h3 id="details-partial-heading">Partial</h3>
        <div data-testid="details-actions">
          {systemDetailsHref ? (
            <>
              <a
                href={systemDetailsHref}
                data-testid="details-button-system-details"
              >
                Details
              </a>{' '}
            </>
          ) : null}
          <a
            href={details.centerHref ?? `/galaxy?center=${encodeURIComponent(id)}&focus=${encodeURIComponent(id)}`}
            data-testid="details-button-center"
          >
            Centre
          </a>{' '}
          <button type="button" data-testid="details-button-directions">
            Directions
          </button>
        </div>
        {renderCanonLayers(canonAnnotations)}
        {renderOrbitingBodies(focusedKind, orbitingBodies)}
        {isSystemFocus ? renderStars(stars, systemName || systemId) : null}
        {isSystemFocus ? renderPlanets(planets, systemName || systemId) : null}
      </section>

      <section
        aria-labelledby="details-full-heading"
        data-testid="details-detent-full"
      >
        <h3 id="details-full-heading">Full</h3>
        {starTelemetry ? (
          <section
            aria-labelledby="details-star-telemetry-heading"
            data-testid="details-star-telemetry-section"
          >
            <h4 id="details-star-telemetry-heading">Stellar Telemetry</h4>
            <dl data-testid="details-star-telemetry-list">
              <dt>Component</dt>
              <dd data-testid="details-star-telemetry-component">
                {starTelemetry.componentDesignation}
              </dd>
              <dt>Spectral Class</dt>
              <dd data-testid="details-star-telemetry-spectral">
                {shouldDisplaySpectralBadge(starTelemetry.spectralType) ? (
                  <Badge category="star">
                    <a
                      href={buildStarTypeGuideHref(starTelemetry.spectralType)}
                      data-testid="details-star-telemetry-spectral-link"
                    >
                      {starTelemetry.spectralType}
                    </a>
                  </Badge>
                ) : (
                  starTelemetry.spectralType
                )}
              </dd>
              <dt>Apparent Magnitude</dt>
              <dd data-testid="details-star-telemetry-mag">
                <Quantity
                  value={starTelemetry.mag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude', id)}
                        data-testid="details-metric-unit-link"
                      >
                        V
                      </a>
                    </Unit>
                  }
                />
              </dd>
              <dt>Absolute Magnitude</dt>
              <dd data-testid="details-star-telemetry-absmag">
                <Quantity
                  value={starTelemetry.absmag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude', id)}
                        data-testid="details-metric-unit-link"
                      >
                        M_V
                      </a>
                    </Unit>
                  }
                />
              </dd>
              {starTelemetry.massMsun !== undefined ? (
                <>
                  <dt>Mass</dt>
                  <dd data-testid="details-star-telemetry-mass">
                    <Quantity
                      value={starTelemetry.massMsun}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('stellar-mass', id)}
                            data-testid="details-metric-unit-link"
                          >
                            M☉
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {starTelemetry.radiusRsun !== undefined ? (
                <>
                  <dt>Radius</dt>
                  <dd data-testid="details-star-telemetry-radius">
                    <Quantity
                      value={starTelemetry.radiusRsun}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('stellar-radius', id)}
                            data-testid="details-metric-unit-link"
                          >
                            R☉
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {starTelemetry.luminosityLsun !== undefined ? (
                <>
                  <dt>Luminosity</dt>
                  <dd data-testid="details-star-telemetry-luminosity">
                    <Quantity
                      value={starTelemetry.luminosityLsun}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('stellar-luminosity', id)}
                            data-testid="details-metric-unit-link"
                          >
                            L☉
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {starTelemetry.effectiveTempK !== undefined ? (
                <>
                  <dt>Effective Temp</dt>
                  <dd data-testid="details-star-telemetry-temp">
                    <Quantity
                      value={starTelemetry.effectiveTempK}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('effective-temperature', id)}
                            data-testid="details-metric-unit-link"
                          >
                            K
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
            </dl>
          </section>
        ) : null}
        {planetTelemetry ? (
          <section
            aria-labelledby="details-planet-telemetry-heading"
            data-testid="details-planet-telemetry-section"
          >
            <h4 id="details-planet-telemetry-heading">Planetary Telemetry</h4>
            <dl data-testid="details-planet-telemetry-list">
              <dt>Composition</dt>
              <dd data-testid="details-planet-telemetry-composition">
                <Badge category="planet">
                  <a
                    href={buildPlanetTypeGuideHref(planetTelemetry.composition)}
                    data-testid="details-planet-telemetry-type-link"
                  >
                    {planetTelemetry.composition}
                  </a>
                </Badge>
              </dd>
              <dt>Habitable Zone</dt>
              <dd data-testid="details-planet-telemetry-habitable">
                {planetTelemetry.isHabitableCandidate ? (
                  <Badge status="nominal">
                    <a
                      href={buildTagGalaxyHref('HabitableCandidate')}
                      data-testid="details-planet-telemetry-habitable-link"
                    >
                      Habitable zone
                    </a>
                  </Badge>
                ) : (
                  'Outside optimistic zone'
                )}
              </dd>
              {planetTelemetry.semiMajorAxisAu !== undefined ? (
                <>
                  <dt>Semi-Major Axis (a)</dt>
                  <dd data-testid="details-planet-telemetry-axis">
                    <Quantity
                      value={planetTelemetry.semiMajorAxisAu}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('semi-major-axis', id)}
                            data-testid="details-metric-unit-link"
                          >
                            AU
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {planetTelemetry.periodDays !== undefined ? (
                <>
                  <dt>Orbital Period (P)</dt>
                  <dd data-testid="details-planet-telemetry-period">
                    <Quantity
                      value={planetTelemetry.periodDays}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('orbital-period', id)}
                            data-testid="details-metric-unit-link"
                          >
                            d
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {planetTelemetry.eccentricity !== undefined ? (
                <>
                  <dt>Eccentricity (e)</dt>
                  <dd data-testid="details-planet-telemetry-eccentricity">
                    {planetTelemetry.eccentricity}
                  </dd>
                </>
              ) : null}
              {planetTelemetry.inclinationDeg !== undefined ? (
                <>
                  <dt>Inclination (i)</dt>
                  <dd data-testid="details-planet-telemetry-inclination">
                    <Quantity
                      value={planetTelemetry.inclinationDeg}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('orbital-inclination', id)}
                            data-testid="details-metric-unit-link"
                          >
                            °
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {planetTelemetry.massMearth !== undefined ? (
                <>
                  <dt>Mass</dt>
                  <dd data-testid="details-planet-telemetry-mass">
                    <Quantity
                      value={planetTelemetry.massMearth}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('planetary-mass', id)}
                            data-testid="details-metric-unit-link"
                          >
                            M⊕
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {planetTelemetry.radiusRearth !== undefined ? (
                <>
                  <dt>Radius</dt>
                  <dd data-testid="details-planet-telemetry-radius">
                    <Quantity
                      value={planetTelemetry.radiusRearth}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('planetary-radius', id)}
                            data-testid="details-metric-unit-link"
                          >
                            R⊕
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {planetTelemetry.equilibriumTempK !== undefined ? (
                <>
                  <dt>Equilibrium Temp</dt>
                  <dd data-testid="details-planet-telemetry-temp">
                    <Quantity
                      value={planetTelemetry.equilibriumTempK}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref(
                              'equilibrium-temperature',
                              id,
                            )}
                            data-testid="details-metric-unit-link"
                          >
                            K
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
              {planetTelemetry.discoveryYear !== undefined ||
              planetTelemetry.discoveryMethod ? (
                <>
                  <dt>Discovery</dt>
                  <dd data-testid="details-planet-telemetry-discovery">
                    {[
                      planetTelemetry.discoveryYear,
                      planetTelemetry.discoveryMethod,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </dd>
                </>
              ) : null}
            </dl>
          </section>
        ) : null}
        {minorBodyTelemetry ? (
          <section
            aria-labelledby="details-minor-body-telemetry-heading"
            data-testid="details-minor-body-telemetry-section"
          >
            <h4 id="details-minor-body-telemetry-heading">Body Telemetry</h4>
            <dl data-testid="details-minor-body-telemetry-list">
              <dt>Classification</dt>
              <dd data-testid="details-minor-body-telemetry-class">
                <Badge status="neutral">
                  {minorBodyTelemetry.categoryLabel}
                </Badge>
              </dd>
              {minorBodyTelemetry.parentBodyName ? (
                <>
                  <dt>Host System</dt>
                  <dd data-testid="details-minor-body-telemetry-parent">
                    {minorBodyTelemetry.parentBodyName}
                  </dd>
                </>
              ) : null}
            </dl>
          </section>
        ) : null}
        {structureTelemetry ? (
          <section
            aria-labelledby="details-structure-telemetry-heading"
            data-testid="details-structure-telemetry-section"
          >
            <h4 id="details-structure-telemetry-heading">
              Structure Telemetry
            </h4>
            <dl data-testid="details-structure-telemetry-list">
              <dt>Structure Type</dt>
              <dd data-testid="details-structure-telemetry-type">
                <Badge status="info">{structureTelemetry.structureType}</Badge>
              </dd>
              {structureTelemetry.radiusPc !== undefined ? (
                <>
                  <dt>Radius</dt>
                  <dd data-testid="details-structure-telemetry-radius">
                    <Quantity
                      value={structureTelemetry.radiusPc}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('galactic-coordinates', id)}
                            data-testid="details-metric-unit-link"
                          >
                            pc
                          </a>
                        </Unit>
                      }
                    />
                  </dd>
                </>
              ) : null}
            </dl>
          </section>
        ) : null}
        <section
          aria-labelledby="details-astrometry-heading"
          data-testid="details-astrometry-section"
        >
          <h4 id="details-astrometry-heading">Astrometry</h4>
          <dl data-testid="details-astrometry-list">
            <dt>System ID</dt>
            <dd data-testid="details-astrometry-system-id">{systemId}</dd>
            <dt>Sector</dt>
            <dd data-testid="details-astrometry-sector">{sectorId}</dd>
            <dt>Coordinates (J2000 pc)</dt>
            <dd data-testid="details-astrometry-coords">
              <Quantity
                value={`${coordinatesPc[0]}, ${coordinatesPc[1]}, ${coordinatesPc[2]}`}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('galactic-coordinates', id)}
                      data-testid="details-metric-unit-link"
                    >
                      pc
                    </a>
                  </Unit>
                }
              />
            </dd>
            {tags.length > 0 ? (
              <>
                <dt>Tags</dt>
                <dd data-testid="details-astrometry-tags">
                  {tags.map((tag, index) => (
                    <Fragment key={tag}>
                      {index > 0 ? ' ' : null}
                      <Badge
                        status={
                          tag === 'HabitableCandidate' ||
                          tag === 'HabitableHost'
                            ? 'nominal'
                            : 'neutral'
                        }
                      >
                        <a
                          href={buildTagGalaxyHref(tag)}
                          data-testid="details-astrometry-tag-link"
                        >
                          {tag}
                        </a>
                      </Badge>
                    </Fragment>
                  ))}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
      </section>

    </section>
  );
};
