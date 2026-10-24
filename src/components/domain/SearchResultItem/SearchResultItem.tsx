import type { MouseEvent, ReactNode } from 'react';
import {
  buildStarTypeGuideHref,
  type SearchResultItem as SearchResultItemModel,
} from '../../../services/searchService';
import {
  Badge,
  CelestialBadge,
  Cluster,
  Quantity,
  SpectralBadge,
  shouldDisplaySpectralBadge,
} from '../../interface';
import { useSearchContext } from '../../search/SearchContext';

export interface SearchResultItemProps {
  readonly result: SearchResultItemModel;
  readonly onSelect?: (result: SearchResultItemModel) => void;
}

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
      const hasPlanets = planetCount !== undefined && planetCount > 0;
      if (!hasSpect && !hasPlanets) {
        return null;
      }
      return (
        <Cluster gap="tight" align="center" data-testid="result-variation-stars">
          {hasSpect && spectralType ? (
            <SpectralBadge
              spectralType={spectralType}
              href={spectralType ? buildStarTypeGuideHref(spectralType) : undefined}
              data-testid="result-spectral-badge"
            />
          ) : null}
          {hasPlanets ? (
            <Quantity
              data-testid="result-planet-summary"
              value={planetCount}
              unit={planetCount === 1 ? 'planet' : 'planets'}
            />
          ) : null}
        </Cluster>
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
      return (
        <span data-testid="result-variation-layers">
          {canonTitle ? <Badge status="info">{canonTitle}</Badge> : null}
        </span>
      );
  }
};

/**
 * Domain Component (`<SearchResultItem>`): accepts a `SearchResultItem` domain record,
 * unpacks its identity, navigation link (`href`), reticle classification (`reticleType`),
 * and category-specific metadata (`stars`, `planets`, `structures`, `minor-bodies`, `layers`),
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

  const searchCtx = useSearchContext();

  const handleClick = (_event: MouseEvent<HTMLAnchorElement>): void => {
    if (searchCtx.dismissSearch) {
      searchCtx.dismissSearch(result);
    } else {
      searchCtx.setQuery('');
      searchCtx.setIsFocused?.(false);
    }
    if (onSelect) {
      onSelect(result);
    }
  };

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
      <Cluster gap="tight" align="center">
        <CelestialBadge type={reticleType} data-testid="result-reticle-type" />
        <a href={href} onClick={handleClick}>
          {name}
        </a>
        {renderVariationContent(result)}
      </Cluster>
    </li>
  );
};
