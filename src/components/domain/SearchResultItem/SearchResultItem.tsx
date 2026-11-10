import type { MouseEvent, ReactNode } from 'react';
import type { SearchResultItem as SearchResultItemModel } from '../../../services/searchService';
import {
  Badge,
  CelestialBadge,
  Cluster,
  Quantity,
  SpectralBadge,
  shouldDisplaySpectralBadge,
} from '../../interface';
import { useSearchContext } from '../Search/SearchContext';
import { useCameraStore } from '../../../stores/useCameraStore';
import { resolveAppHref } from '../../../utils/url';
import { handleSpaNavigation } from '../../../hooks/spaNavigation';
import styles from './SearchResultItem.module.css';

export interface SearchResultItemProps {
  readonly result: SearchResultItemModel;
  readonly onSelect?: (result: SearchResultItemModel) => void;
}

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
              interactive={false}
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
 * and renders a single-anchor keyboard/pointer accessible list item (DEC-R052).
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

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (targetView === 'galaxy') {
      const focusParam = new URLSearchParams(href.split('?')[1] ?? '').get('focus');
      if (focusParam) {
        useCameraStore.getState().clearCanvasFocus();
        useCameraStore.getState().setPendingCenterSlug(focusParam);
        useCameraStore.getState().triggerRecenter();
      }
    }
    if (searchCtx.dismissSearch) {
      searchCtx.dismissSearch(result);
    } else {
      searchCtx.setQuery('');
      searchCtx.setIsFocused?.(false);
    }
    if (onSelect) {
      onSelect(result);
    }
    handleSpaNavigation(event, href);
  };

  return (
    <li
      className={styles.searchResultItem}
      data-testid="search-result-item"
      data-entity-id={id}
      data-system-id={systemId}
      data-category={category}
      data-entity-kind={entityKind}
      data-reticle={reticleType}
      data-target-view={targetView}
    >
      <a
        href={resolveAppHref(href)}
        className={styles.resultLink}
        onClick={handleClick}
      >
        <Cluster gap="tight" align="center">
          <CelestialBadge
            type={reticleType}
            interactive={false}
            data-testid="result-reticle-type"
          />
          <span className={styles.resultName}>{name}</span>
          {renderVariationContent(result)}
        </Cluster>
      </a>
    </li>
  );
};
