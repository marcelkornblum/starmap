import { Fragment, type ReactNode } from 'react';
import {
  buildSystemElementFocusHref,
  type FocusedEntityDetails,
} from '../../../services/detailsService';
import {
  PLANET_COMPOSITION_TYPES,
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

const HABITABLE_CANDIDATE_PHRASE = 'Habitable zone candidate';
const HABITABLE_CANDIDATE_LOWER_PHRASE = 'habitable zone candidate';

const renderTextWithHabitableBadge = (
  text: string,
  testId: string,
): ReactNode => {
  if (!text.includes(HABITABLE_CANDIDATE_LOWER_PHRASE)) {
    return text;
  }
  const parts = text.split(HABITABLE_CANDIDATE_LOWER_PHRASE);
  const href = buildTagGalaxyHref('HabitableCandidate');
  return parts.map((part, idx) => (
    <Fragment key={idx}>
      {part}
      {idx < parts.length - 1 ? (
        <Badge status="nominal">
          <a href={href} data-testid={testId}>
            {HABITABLE_CANDIDATE_LOWER_PHRASE}
          </a>
        </Badge>
      ) : null}
    </Fragment>
  ));
};

const renderSummaryWithSpectralLink = (
  summary: string,
  spectralType?: string,
): ReactNode => {
  if (
    !spectralType ||
    !shouldDisplaySpectralBadge(spectralType) ||
    !summary.includes(spectralType)
  ) {
    return renderTextWithHabitableBadge(
      summary,
      'details-summary-habitable-link',
    );
  }

  const parts = summary.split(spectralType);
  const href = buildStarTypeGuideHref(spectralType);

  return parts.map((part, index) => (
    <Fragment key={index}>
      {renderTextWithHabitableBadge(part, 'details-summary-habitable-link')}
      {index < parts.length - 1 ? (
        <Badge category="star">
          <a href={href} data-testid="details-summary-spectral-link">
            {spectralType}
          </a>
        </Badge>
      ) : null}
    </Fragment>
  ));
};

const PLANET_SUMMARY_TOKEN_REGEX = new RegExp(
  `(${[...PLANET_COMPOSITION_TYPES, HABITABLE_CANDIDATE_PHRASE].join('|')})`,
  'g',
);

const renderSummaryWithPlanetTypeLinks = (summary: string): ReactNode => {
  const hasPlanetType = PLANET_COMPOSITION_TYPES.some((t) =>
    summary.includes(t),
  );
  const hasHabitablePhrase = summary.includes(HABITABLE_CANDIDATE_PHRASE);
  if (!hasPlanetType && !hasHabitablePhrase) {
    return summary;
  }

  const parts = summary.split(PLANET_SUMMARY_TOKEN_REGEX);
  return parts.map((part, index) => {
    const isPlanetType = (
      PLANET_COMPOSITION_TYPES as readonly string[]
    ).includes(part);
    if (isPlanetType) {
      return (
        <Badge key={index} category="planet">
          <a
            href={buildPlanetTypeGuideHref(part)}
            data-testid="details-summary-planet-type-link"
          >
            {part}
          </a>
        </Badge>
      );
    }
    if (part === HABITABLE_CANDIDATE_PHRASE) {
      return (
        <Badge key={index} status="nominal">
          <a
            href={buildTagGalaxyHref('HabitableCandidate')}
            data-testid="details-habitable-zone-link"
          >
            {part}
          </a>
        </Badge>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
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
    focusedKind = 'system',
    spectralType,
    reticleType,
    starCount,
    planetCompositionSummary,
    systemSummary,
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
    canonAnnotations,
  } = details;

  const hasSpectBadge = shouldDisplaySpectralBadge(spectralType);

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
          {hasSpectBadge && spectralType ? (
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
          {' · '}
          <span data-testid="details-star-count">
            {`${starCount} ${starCount === 1 ? 'star' : 'stars'}`}
          </span>
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
                        href={buildMetricGuideHref('semi-major-axis')}
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
                        href={buildMetricGuideHref('orbital-period')}
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
                        href={buildMetricGuideHref('planetary-mass')}
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
                        href={buildMetricGuideHref('equilibrium-temperature')}
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
                    href={buildMetricGuideHref('stellar-magnitude')}
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
                    href={buildMetricGuideHref('stellar-magnitude')}
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
        <p data-testid="details-planet-composition">
          {renderSummaryWithPlanetTypeLinks(planetCompositionSummary)}
        </p>
        <p data-testid="details-system-summary">
          {renderSummaryWithSpectralLink(systemSummary, spectralType)}
        </p>
      </section>

      <section
        aria-labelledby="details-partial-heading"
        data-testid="details-detent-partial"
      >
        <h3 id="details-partial-heading">Partial</h3>
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
                        href={buildMetricGuideHref('stellar-magnitude')}
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
                        href={buildMetricGuideHref('stellar-magnitude')}
                        data-testid="details-metric-unit-link"
                      >
                        M_V
                      </a>
                    </Unit>
                  }
                />
              </dd>
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
                            href={buildMetricGuideHref('semi-major-axis')}
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
                            href={buildMetricGuideHref('orbital-period')}
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
              {planetTelemetry.massMearth !== undefined ? (
                <>
                  <dt>Mass</dt>
                  <dd data-testid="details-planet-telemetry-mass">
                    <Quantity
                      value={planetTelemetry.massMearth}
                      unit={
                        <Unit>
                          <a
                            href={buildMetricGuideHref('planetary-mass')}
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
                            href={buildMetricGuideHref('galactic-coordinates')}
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
                      href={buildMetricGuideHref('galactic-coordinates')}
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
        <div data-testid="details-actions">
          <a
            href={systemDetailsHref}
            data-testid="details-button-system-details"
          >
            Details
          </a>{' '}
          <button type="button" data-testid="details-button-directions">
            Directions
          </button>
        </div>
      </section>

      <section
        aria-labelledby="details-full-heading"
        data-testid="details-detent-full"
      >
        <h3 id="details-full-heading">Full</h3>

        {canonAnnotations.length > 0 ? (
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
        ) : null}

        {stars.length > 0 ? (
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
                        systemName || systemId,
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
                          href={buildMetricGuideHref('stellar-magnitude')}
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
                          href={buildMetricGuideHref('stellar-magnitude')}
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
        ) : null}

        {planets.length > 0 ? (
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
                        systemName || systemId,
                        planet.name || planet.id,
                      )
                    }
                    data-testid="details-planet-name-link"
                  >
                    {planet.name}
                  </a>
                  {' '}
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
                              href={buildMetricGuideHref('semi-major-axis')}
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
                              href={buildMetricGuideHref('orbital-period')}
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
                              href={buildMetricGuideHref('planetary-mass')}
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
                              href={buildMetricGuideHref('equilibrium-temperature')}
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
        ) : null}
      </section>
    </section>
  );
};
