import type { MouseEvent, ReactNode } from 'react';
import type { SearchResultItem as SearchResultItemModel } from '../../../services/search/searchTypes';
import {
  Badge,
  CelestialBadge,
  Cluster,
  Quantity,
  SpectralBadge,
  shouldDisplaySpectralBadge,
} from '../../interface';
import { useSearchContext } from '../Search/SearchContext';
import { useOptionalSpatialEntityStoreApi } from '../../canvas/entity/SpatialEntityContext';
import { useCameraStore } from '../../../stores/useCameraStore';
import type { SpatialEntityDefinition } from '../../../types/spatial';
import { resolveAppHref } from '../../../utils/url';
import { useSpaLinkClick } from '../../../hooks/spaNavigation';
import {
  cancelHoverPrefetch,
  scheduleHoverPrefetch,
} from '../../../services/details/prefetchEntitySelection';
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

function isZeroSpatialPosition(
  position: SpatialEntityDefinition['position'] | readonly [number, number, number],
): boolean {
  if ('x' in position) {
    return position.x === 0 && position.y === 0 && position.z === 0;
  }
  return position[0] === 0 && position[1] === 0 && position[2] === 0;
}

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
  const spatialStore = useOptionalSpatialEntityStoreApi();
  const handleSpaLinkClick = useSpaLinkClick();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    cancelHoverPrefetch();
    const focusParam =
      targetView === 'galaxy'
        ? new URLSearchParams(href.split('?')[1] ?? '').get('focus')
        : null;

    if (targetView === 'galaxy') {
      if (spatialStore && result.position) {
        const state = spatialStore.getState();
        const existing = state.entities[id];
        if (
          !existing ||
          (isZeroSpatialPosition(existing.position) &&
            !isZeroSpatialPosition(result.position))
        ) {
          state.registerEntity({
            id,
            name,
            position: [
              result.position[0],
              result.position[1],
              result.position[2],
            ],
            classification: reticleType,
            ...(result.spectralType ? { spectralType: result.spectralType } : {}),
          });
        }
      }
      if (focusParam) {
        useCameraStore.getState().focusFromSearch(focusParam);
      }
    }
    if (searchCtx.dismissSearch) {
      searchCtx.dismissSearch(result);
    } else {
      searchCtx.setQuery('');
      searchCtx.setIsFocused?.(false);
    }
    if (targetView === 'galaxy' && focusParam && spatialStore) {
      const state = spatialStore.getState();
      const focusTargetId =
        state.resolveEntityId(id) ??
        state.resolveEntityId(focusParam) ??
        focusParam;
      state.setFocused(focusTargetId);
    }
    if (onSelect) {
      onSelect(result);
    }
    handleSpaLinkClick(event, href);
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
        onMouseEnter={() => scheduleHoverPrefetch(id, systemId)}
        onFocus={() => scheduleHoverPrefetch(id, systemId)}
        onMouseLeave={cancelHoverPrefetch}
        onBlur={cancelHoverPrefetch}
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
