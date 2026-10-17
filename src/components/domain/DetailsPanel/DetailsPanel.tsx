import { Fragment, type ReactNode } from 'react';
import type { FocusedEntityDetails } from '../../../services/detailsService';
import {
  buildCanonLayerGalaxyHref,
  buildStarTypeGuideHref,
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
    stars,
    planets,
    canonAnnotations,
    coordinatesPc,
    sectorId,
    tags,
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
          {planetCompositionSummary}
        </p>
      </section>

      <section
        aria-labelledby="details-partial-heading"
        data-testid="details-detent-partial"
      >
        <h3 id="details-partial-heading">Partial</h3>
        <p data-testid="details-system-summary">
          {renderSummaryWithSpectralLink(systemSummary, spectralType)}
        </p>
        <div data-testid="details-actions">
          <button type="button" data-testid="details-button-centre">
            Centre
          </button>{' '}
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
                  data-target-id={annotation.targetId}
                >
                  <strong>
                    <a
                      href={
                        annotation.layerHref ||
                        buildCanonLayerGalaxyHref(annotation.layerId)
                      }
                      data-testid="details-canon-link"
                    >
                      {annotation.layerTitle}
                    </a>
                  </strong>
                  {annotation.inUniverseName
                    ? ` — ${annotation.inUniverseName}`
                    : ''}
                  {`: ${annotation.text}`}
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
                  {planet.name}
                  {` [${planet.composition}]`}
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
                  {tags.join(', ')}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
      </section>
    </section>
  );
};
