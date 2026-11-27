import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResultItem } from './SearchResultItem';
import { formatPlanetCountSummary } from './searchResultFormatting';
import { SearchContext, type SearchContextValue } from '../Search/SearchContext';
import { executeCatalogSearch } from '../../../services/search/searchExecution';
import type { SearchResultItem as SearchResultItemModel } from '../../../services/search/searchTypes';
import { useCameraStore } from '../../../stores/useCameraStore';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { SpatialEntityStoreContext } from '../../canvas/entity/SpatialEntityContext';
import * as prefetchModule from '../../../services/details/prefetchEntitySelection';

function makeResult(overrides: Partial<SearchResultItemModel>): SearchResultItemModel {
  return {
    id: 'sirius',
    name: 'Sirius',
    category: 'stars',
    entityKind: 'star-system',
    reticleType: 'stellar-system',
    targetView: 'galaxy',
    href: '/galaxy?focus=sirius',
    score: 1.0,
    ...overrides,
  };
}

function renderWithSearchContext(
  ui: ReactNode,
  overrides: Partial<SearchContextValue> = {},
  spatialStore?: ReturnType<typeof createSpatialEntityStore>,
) {
  const value: SearchContextValue = {
    query: 'sol',
    filter: 'all',
    status: 'ready',
    errorMessage: null,
    results: executeCatalogSearch([], { query: 'sol', filter: 'all' }),
    setQuery: vi.fn(),
    setFilter: vi.fn(),
    submitSearch: vi.fn(),
    isFocused: true,
    setIsFocused: vi.fn(),
    dismissSearch: vi.fn(),
    ...overrides,
  };
  const tree = <SearchContext.Provider value={value}>{ui}</SearchContext.Provider>;
  return render(
    spatialStore ? (
      <SpatialEntityStoreContext.Provider value={spatialStore}>
        {tree}
      </SpatialEntityStoreContext.Provider>
    ) : (
      tree
    ),
  );
}

describe('<SearchResultItem />', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useCameraStore.getState().reset();
    window.history.pushState({}, '', '/');
  });
  describe('formatPlanetCountSummary', () => {
    it('returns null for undefined or non-positive values', () => {
      expect(formatPlanetCountSummary(undefined)).toBeNull();
      expect(formatPlanetCountSummary(0)).toBeNull();
      expect(formatPlanetCountSummary(-1)).toBeNull();
    });

    it('formats singular and plural counts correctly', () => {
      expect(formatPlanetCountSummary(1)).toBe('1 planet');
      expect(formatPlanetCountSummary(8)).toBe('8 planets');
    });
  });

  const mockStarResult: SearchResultItemModel = {
    id: 'sol',
    name: 'Sol System',
    category: 'stars',
    entityKind: 'star-system',
    reticleType: 'stellar-system',
    targetView: 'system',
    href: '/system/sol',
    systemId: 'sol',
    spectralType: 'G2V',
    planetCount: 8,
    score: 1.0,
  };

  const mockLayerResult: SearchResultItemModel = {
    id: 'layer-star-trek',
    name: 'Star Trek Federation Space',
    category: 'layers',
    entityKind: 'layer',
    reticleType: 'stellar-cluster',
    targetView: 'galaxy',
    href: '/galaxy?select=layer:star-trek',
    canonTitle: 'Star Trek Canon',
    score: 0.9,
  };

  it('renders a star result with single anchor, non-interactive badges, and planet count', () => {
    render(<SearchResultItem result={mockStarResult} />);

    const item = screen.getByTestId('search-result-item');
    expect(item.getAttribute('data-entity-id')).toBe('sol');
    expect(item.getAttribute('data-category')).toBe('stars');

    // Single native anchor per row (DEC-R052)
    const links = item.querySelectorAll('a');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/system/sol');

    const reticleBadge = screen.getByTestId('result-reticle-type');
    expect(reticleBadge.tagName).not.toBe('A');
    expect(reticleBadge.closest('a')).toBe(links[0]);

    const spectralBadge = screen.getByTestId('result-spectral-badge');
    expect(spectralBadge.tagName).not.toBe('A');
    expect(spectralBadge.getAttribute('href')).toBeNull();

    expect(screen.getByText('Sol System')).toBeInTheDocument();
    expect(screen.getByTestId('result-planet-summary')).toBeInTheDocument();
  });

  it('renders a layer result with canon badge', () => {
    render(<SearchResultItem result={mockLayerResult} />);

    expect(screen.getByTestId('result-variation-layers')).toBeInTheDocument();
    expect(screen.getByText('Star Trek Canon')).toBeInTheDocument();
  });

  it('renders a bare star without spectral badge when spectral type is missing or unknown', () => {
    render(<SearchResultItem result={makeResult({ id: 'bare-star', name: 'Bare Star', href: '/galaxy?focus=bare-star' })} />);

    expect(screen.getByText('Bare Star')).toBeInTheDocument();
    expect(screen.queryByTestId('result-spectral-badge')).toBeNull();
  });

  it('calls onSelect and dismissSearch on single-anchor click', () => {
    const onSelect = vi.fn();
    const dismissSearch = vi.fn();

    renderWithSearchContext(
      <SearchResultItem result={mockStarResult} onSelect={onSelect} />,
      { dismissSearch },
    );

    fireEvent.click(screen.getByRole('link', { name: /sol system/i }));
    expect(dismissSearch).toHaveBeenCalledWith(mockStarResult);
    expect(onSelect).toHaveBeenCalledWith(mockStarResult);
  });

  it('invokes focusFromSearch when clicking a galaxy-targeted result with a focus param', () => {
    const focusFromSearchSpy = vi.fn();
    vi.spyOn(useCameraStore, 'getState').mockReturnValue({
      focusFromSearch: focusFromSearchSpy,
    } as unknown as ReturnType<typeof useCameraStore.getState>);

    renderWithSearchContext(<SearchResultItem result={makeResult({})} />);
    fireEvent.click(screen.getByRole('link', { name: /sirius/i }));

    expect(focusFromSearchSpy).toHaveBeenCalledWith('sirius');
  });

  it('triggers hover prefetch scheduling on mouse enter and focus, cancelling on mouse leave, blur, and click', () => {
    const scheduleSpy = vi.spyOn(prefetchModule, 'scheduleHoverPrefetch').mockReturnValue();
    const cancelSpy = vi.spyOn(prefetchModule, 'cancelHoverPrefetch').mockReturnValue();

    render(<SearchResultItem result={mockStarResult} />);

    const link = screen.getByRole('link', { name: /sol system/i });
    fireEvent.mouseEnter(link);
    expect(scheduleSpy).toHaveBeenCalledWith('sol', 'sol');
    fireEvent.mouseLeave(link);
    expect(cancelSpy).toHaveBeenCalled();
    fireEvent.focus(link);
    expect(scheduleSpy).toHaveBeenCalledWith('sol', 'sol');
    fireEvent.blur(link);
    expect(cancelSpy).toHaveBeenCalled();
    fireEvent.click(link);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('registers entity coordinates in SpatialEntityStore (replacing [0,0,0] fallback), invokes focusFromSearch, and preserves focused state after dismissSearch', () => {
    const focusFromSearchSpy = vi.fn();
    vi.spyOn(useCameraStore, 'getState').mockReturnValue({
      focusFromSearch: focusFromSearchSpy,
    } as unknown as ReturnType<typeof useCameraStore.getState>);

    const spatialStore = createSpatialEntityStore();
    spatialStore.getState().registerEntity({
      id: 'sirius',
      name: 'Sirius',
      position: [0, 0, 0],
      classification: 'stellar-system',
    });
    spatialStore.getState().setSelectedIds(['sirius']);

    const galaxyResult = makeResult({ position: [-1.61, 2.09, -0.45], spectralType: 'A1V' });
    const dismissSearch = vi.fn(() => {
      spatialStore.getState().setSelectedIds([]);
      spatialStore.getState().setFocused(null);
    });

    renderWithSearchContext(
      <SearchResultItem result={galaxyResult} />,
      { query: 'sirius', dismissSearch },
      spatialStore,
    );

    fireEvent.click(screen.getByRole('link', { name: /sirius/i }));
    expect(focusFromSearchSpy).toHaveBeenCalledWith('sirius');
    expect(dismissSearch).toHaveBeenCalledWith(galaxyResult);
    expect(spatialStore.getState().entities['sirius']?.position).toEqual([-1.61, 2.09, -0.45]);
    expect(spatialStore.getState().focusedId).toBe('sirius');
  });

  it('ignores modified or non-primary clicks before mutating stores or dismissing search', () => {
    const focusFromSearchSpy = vi.fn();
    vi.spyOn(useCameraStore, 'getState').mockReturnValue({
      focusFromSearch: focusFromSearchSpy,
    } as unknown as ReturnType<typeof useCameraStore.getState>);
    const spatialStore = createSpatialEntityStore();
    const dismissSearch = vi.fn();
    const onSelect = vi.fn();
    const galaxyResult = makeResult({ position: [-1.61, 2.09, -0.45] });

    renderWithSearchContext(
      <SearchResultItem result={galaxyResult} onSelect={onSelect} />,
      { query: 'sirius', dismissSearch },
      spatialStore,
    );

    const link = screen.getByRole('link', { name: /sirius/i });
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { button: 1 });

    expect(focusFromSearchSpy).not.toHaveBeenCalled();
    expect(dismissSearch).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(spatialStore.getState().entities['sirius']).toBeUndefined();
    expect(spatialStore.getState().focusedId).toBeNull();
  });

  it('normalises non-slug focusParam with toUrlSlug before calling focusFromSearch', () => {
    const focusFromSearchSpy = vi.fn();
    vi.spyOn(useCameraStore, 'getState').mockReturnValue({
      focusFromSearch: focusFromSearchSpy,
    } as unknown as ReturnType<typeof useCameraStore.getState>);

    renderWithSearchContext(
      <SearchResultItem
        result={makeResult({ id: 'alpha-centauri', name: 'Alpha Centauri', href: '/galaxy?focus=Alpha%20Centauri' })}
      />,
    );
    fireEvent.click(screen.getByRole('link', { name: /alpha centauri/i }));
    expect(focusFromSearchSpy).toHaveBeenCalledWith('alpha-centauri');
  });

  it('triggers focusFromSearch or triggerRecenter on intra-view system and planet search clicks', () => {
    const focusFromSearchSpy = vi.fn();
    const triggerRecenterSpy = vi.fn();
    vi.spyOn(useCameraStore, 'getState').mockReturnValue({
      focusFromSearch: focusFromSearchSpy,
      triggerRecenter: triggerRecenterSpy,
    } as unknown as ReturnType<typeof useCameraStore.getState>);

    window.history.pushState({}, '', '/system/sol');
    const planetInSol = makeResult({
      id: 'earth',
      name: 'Earth',
      category: 'planets',
      entityKind: 'planet',
      reticleType: 'terrestrial',
      targetView: 'system',
      href: '/system/sol?focus=Earth',
      systemId: 'sol',
    });
    const { unmount } = renderWithSearchContext(<SearchResultItem result={planetInSol} />);
    fireEvent.click(screen.getByRole('link', { name: /earth/i }));
    expect(focusFromSearchSpy).toHaveBeenCalledWith('earth');
    unmount();

    window.history.pushState({}, '', '/system/sol');
    renderWithSearchContext(<SearchResultItem result={mockStarResult} />);
    fireEvent.click(screen.getByRole('link', { name: /sol system/i }));
    expect(triggerRecenterSpy).toHaveBeenCalledTimes(1);
  });

  it('passes triggerRecenter: false to focusFromSearch when result href already includes ?center=', () => {
    const focusFromSearchSpy = vi.fn();
    vi.spyOn(useCameraStore, 'getState').mockReturnValue({
      focusFromSearch: focusFromSearchSpy,
      triggerRecenter: vi.fn(),
    } as unknown as ReturnType<typeof useCameraStore.getState>);

    window.history.pushState({}, '', '/system/sol');
    const centeredPlanet = makeResult({
      id: 'earth',
      name: 'Earth',
      category: 'planets',
      entityKind: 'planet',
      reticleType: 'terrestrial',
      targetView: 'system',
      href: '/system/sol?center=earth&focus=earth',
      systemId: 'sol',
    });
    renderWithSearchContext(<SearchResultItem result={centeredPlanet} />);
    fireEvent.click(screen.getByRole('link', { name: /earth/i }));
    expect(focusFromSearchSpy).toHaveBeenCalledWith('earth', { triggerRecenter: false });
  });
});
