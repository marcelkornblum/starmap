import { Fragment, type ReactNode } from 'react';
import type { FocusedEntityDetails } from '../../../services/detailsService';
import {
  PLANET_COMPOSITION_TYPES,
  buildCanonLayerGalaxyHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import { shouldDisplaySpectralBadge } from '../SearchResultItem/SearchResultItem';

export interface DetailsPanelProps {
  readonly details: FocusedEntityDetails | null;
}

const renderSummaryWithSpectralLink = (
  summary: string,
  spectralType?: string,
): ReactNode => {
  if (
    !spectralType ||
    !shouldDisplaySpectralBadge(spectralType) ||
    !summary.includes(spectralType)
  ) {
    return summary;
  }

  const parts = summary.split(spectralType);
  const href = buildStarTypeGuideHref(spectralType);

  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? (
        <a href={href} data-testid="details-summary-spectral-link">
          {spectralType}
        </a>
      ) : null}
    </Fragment>
  ));
};

const PLANET_TYPE_TOKEN_REGEX = new RegExp(
  `(${PLANET_COMPOSITION_TYPES.join('|')})`,
  'g',
);

const renderSummaryWithPlanetTypeLinks = (summary: string): ReactNode => {
  if (!PLANET_COMPOSITION_TYPES.some((t) => summary.includes(t))) {
    return summary;
  }

  const parts = summary.split(PLANET_TYPE_TOKEN_REGEX);
  return parts.map((part, index) => {
    const isPlanetType = (
      PLANET_COMPOSITION_TYPES as readonly string[]
    ).includes(part);
    if (isPlanetType) {
      return (
        <a
          key={index}
          href={buildPlanetTypeGuideHref(part)}
          data-testid="details-summary-planet-type-link"
        >
          {part}
        </a>
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
    spectralType,
    reticleType,
    starCount,
    planetCompositionSummary,
    systemSummary,
    coordinatesPc,
    sectorId,
    tags,
    systemDetailsHref,
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
              <a
                href={buildStarTypeGuideHref(spectralType)}
                data-testid="details-spectral-badge"
              >
                {spectralType}
              </a>
            </>
          ) : null}
          {' · '}
          <span data-testid="details-star-count">
            {`${starCount} ${starCount === 1 ? 'star' : 'stars'}`}
          </span>
        </p>
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
              {`${coordinatesPc[0]}, ${coordinatesPc[1]}, ${coordinatesPc[2]}`}
            </dd>
            {tags.length > 0 ? (
              <>
                <dt>Tags</dt>
                <dd data-testid="details-astrometry-tags">
                  {tags.map((tag, index) => (
                    <Fragment key={tag}>
                      {index > 0 ? ', ' : null}
                      <a
                        href={buildTagGalaxyHref(tag)}
                        data-testid="details-astrometry-tag-link"
                      >
                        {tag}
                      </a>
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
                      <a
                        href={
                          annotation.layerHref ||
                          buildCanonLayerGalaxyHref(annotation.layerId)
                        }
                        data-testid="details-canon-link"
                      >
                        {annotation.layerTitle}
                      </a>
                    </summary>
                    <p data-testid="details-canon-text">{annotation.text}</p>
                    {annotation.tags.length > 0 ? (
                      <p data-testid="details-canon-tags">
                        {'Tags: '}
                        {annotation.tags.map((tag, index) => (
                          <Fragment key={tag}>
                            {index > 0 ? ', ' : null}
                            <a
                              href={buildTagGalaxyHref(tag)}
                              data-testid="details-canon-tag-link"
                            >
                              {tag}
                            </a>
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
                  {`${star.name} (`}
                  {shouldDisplaySpectralBadge(star.spectralType) ? (
                    <a
                      href={buildStarTypeGuideHref(star.spectralType)}
                      data-testid="details-star-spectral-link"
                    >
                      {star.spectralType}
                    </a>
                  ) : (
                    star.spectralType
                  )}
                  {`, V ${star.mag}, M_V ${star.absmag})`}
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
                  {`${planet.name} [`}
                  <a
                    href={buildPlanetTypeGuideHref(planet.composition)}
                    data-testid="details-planet-type-link"
                  >
                    {planet.composition}
                  </a>
                  {']'}
                  {planet.semiMajorAxisAu !== undefined
                    ? ` · a = ${planet.semiMajorAxisAu} AU`
                    : ''}
                  {planet.periodDays !== undefined
                    ? ` · P = ${planet.periodDays} d`
                    : ''}
                  {planet.massMearth !== undefined
                    ? ` · ${planet.massMearth} M⊕`
                    : ''}
                  {planet.equilibriumTempK !== undefined
                    ? ` · ${planet.equilibriumTempK} K`
                    : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </section>
  );
};
