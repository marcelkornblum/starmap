import type { MouseEvent, ReactNode } from 'react';
import {
  buildStarTypeGuideHref,
  type SearchResultItem as SearchResultItemModel,
} from '../../../services/searchService';
import { Badge } from '../../interface/information';

export interface SearchResultItemProps {
  readonly result: SearchResultItemModel;
  readonly onSelect?: (result: SearchResultItemModel) => void;
}

/**
 * Pure predicate determining whether a stellar spectral type badge should be displayed.
 */
export const shouldDisplaySpectralBadge = (spectralType?: string): boolean =>
  Boolean(spectralType && spectralType.trim().length > 0 && spectralType !== 'Unknown');

/**
 * Pure formatter producing the pluralized planet count summary for a stellar system result.
 */
export const formatPlanetCountSummary = (planetCount?: number): string | null => {
  if (planetCount === undefined || planetCount <= 0) {
    return null;
  }
  return `${planetCount} ${planetCount === 1 ? 'planet' : 'planets'}`;
};

const renderVariationContent = (
  data: SearchResultItemModel,
): ReactNode => {
  const { category, entityKind, spectralType, planetCount, canonTitle } = data;

  switch (category) {
    case 'stars': {
      const hasSpect = shouldDisplaySpectralBadge(spectralType);
      const planetSummary = formatPlanetCountSummary(planetCount);
      if (!hasSpect && !planetSummary) {
        return null;
      }
      return (
        <span data-testid="result-variation-stars">
          {' ('}
          {hasSpect && spectralType ? (
            <Badge category="star">
              <a
                href={buildStarTypeGuideHref(spectralType)}
                data-testid="result-spectral-badge"
              >
                {spectralType}
              </a>
            </Badge>
          ) : null}
          {hasSpect && planetSummary ? ' · ' : null}
          {planetSummary ? (
            <span data-testid="result-planet-summary">{planetSummary}</span>
          ) : null}
          {')'}
        </span>
      );
    }

    case 'planets':
      return (
        <span
          data-testid="result-variation-planets"
          data-planet-kind={entityKind}
        />
      );

    case 'structures':
      return <span data-testid="result-variation-structures" />;

    case 'minor-bodies':
      return <span data-testid="result-variation-minor-bodies" />;

    case 'layers':
    case 'fiction':
      return canonTitle ? (
        <span data-testid="result-variation-fiction">
          {` (${canonTitle})`}
        </span>
      ) : (
        <span data-testid="result-variation-fiction" />
      );
  }
};

/**
 * Domain Component (`<SearchResultItem>`): accepts a `SearchResultItem` domain record,
 * unpacks its identity, navigation link (`href`), reticle classification (`reticleType`),
 * and category-specific metadata (`stars`, `planets`, `structures`, `minor-bodies`, `fiction`),
 * and renders an unstyled semantic stub (Stage 1).
 */
export const SearchResultItem = ({ result, onSelect }: SearchResultItemProps) => {
  const {
    id,
    name,
    category,
    entityKind,
    reticleType,
    targetView,
    href,
    systemId,
  } = result;

  const handleClick = onSelect
    ? (event: MouseEvent<HTMLAnchorElement>): void => {
        event.preventDefault();
        onSelect(result);
      }
    : undefined;

  return (
    <li
      data-testid="search-result-item"
      data-entity-id={id}
      data-system-id={systemId}
      data-category={category}
      data-entity-kind={entityKind}
      data-reticle={reticleType}
      data-target-view={targetView}
    >
      <a href={href} onClick={handleClick}>
        {name}
      </a>{' '}
      <span data-testid="result-reticle-type">{`[${reticleType}]`}</span>
      {renderVariationContent(result)}
    </li>
  );
};
