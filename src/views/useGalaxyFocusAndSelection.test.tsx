import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGalaxyFocusAndSelection } from './useGalaxyFocusAndSelection';
import type { SpatialEntityDefinition } from '../types/spatial';
import type { CompactSearchEntry } from '../utils/compactDataTypes';

describe('useGalaxyFocusAndSelection', () => {
  const corpus: CompactSearchEntry[] = [
    {
      i: 'sol',
      n: 'Sol',
      p: [0, 0, 0],
      m: [0, 'G2V', 8, 1],
    },
    {
      i: 'earth',
      n: 'Earth',
      s: 'sol',
      p: [0, 0, 0],
    },
    {
      i: 'tau-ceti',
      n: 'Tau Ceti',
      p: [3.15, 1.54, -1.0],
      m: [3.5, 'G8V', 4, 1],
    },
  ];

  it('uses storeFocusedEntity directly when urlFocusSlug is null', () => {
    const storeEntity: SpatialEntityDefinition = {
      id: 'custom-star',
      name: 'Custom Star',
      classification: 'star',
      position: [1, 2, 3],
    };

    const { result } = renderHook(() =>
      useGalaxyFocusAndSelection({
        urlFocusSlug: null,
        storeFocusedEntity: storeEntity,
        apertureCorpus: corpus,
        activeCorpus: corpus,
        storeSelected: [],
        layerIndex: [],
        loadedLayers: [],
        selectQuery: '',
      }),
    );

    expect(result.current.focusedEntity).toBe(storeEntity);
    expect(result.current.targetSystemId).toBe('custom-star');
    expect(result.current.canvasEntities).toEqual([storeEntity]);
  });

  it('resolves focused entity from apertureCorpus when urlFocusSlug is provided and store is empty', () => {
    const { result } = renderHook(() =>
      useGalaxyFocusAndSelection({
        urlFocusSlug: 'tau-ceti',
        storeFocusedEntity: null,
        apertureCorpus: corpus,
        activeCorpus: corpus,
        storeSelected: [],
        layerIndex: [],
        loadedLayers: [],
        selectQuery: '',
      }),
    );

    expect(result.current.focusedEntity?.id).toBe('tau-ceti');
    expect(result.current.targetSystemId).toBe('tau-ceti');
  });

  it('resolves targetSystemId to host system "s" when focused on a child planet', () => {
    const { result } = renderHook(() =>
      useGalaxyFocusAndSelection({
        urlFocusSlug: 'earth',
        storeFocusedEntity: null,
        apertureCorpus: corpus,
        activeCorpus: corpus,
        storeSelected: [],
        layerIndex: [],
        loadedLayers: [],
        selectQuery: '',
      }),
    );

    expect(result.current.focusedEntity?.id).toBe('earth');
    expect(result.current.targetSystemId).toBe('sol');
  });

  it('prefers storeSelected over url selection when storeSelected is non-empty', () => {
    const storeSelected: SpatialEntityDefinition[] = [
      { id: 'sel-1', name: 'Selected 1', classification: 'star', position: [5, 5, 5] },
    ];

    const { result } = renderHook(() =>
      useGalaxyFocusAndSelection({
        urlFocusSlug: null,
        storeFocusedEntity: null,
        apertureCorpus: corpus,
        activeCorpus: corpus,
        storeSelected,
        layerIndex: [],
        loadedLayers: [],
        selectQuery: '',
      }),
    );

    expect(result.current.selectedEntities).toBe(storeSelected);
    expect(result.current.canvasEntities).toEqual(storeSelected);
  });

  it('deduplicates canvasEntities when focused entity is already present in selectedEntities', () => {
    const entity: SpatialEntityDefinition = {
      id: 'sol',
      name: 'Sol',
      classification: 'star',
      position: [0, 0, 0],
    };

    const { result } = renderHook(() =>
      useGalaxyFocusAndSelection({
        urlFocusSlug: 'sol',
        storeFocusedEntity: entity,
        apertureCorpus: corpus,
        activeCorpus: corpus,
        storeSelected: [entity],
        layerIndex: [],
        loadedLayers: [],
        selectQuery: '',
      }),
    );

    expect(result.current.canvasEntities.length).toBe(1);
    expect(result.current.canvasEntities[0]?.id).toBe('sol');
  });

  it('maintains reference stability for canvasEntities returning empty array when focusedEntity is null and selectedEntities is empty', () => {
    const { result, rerender } = renderHook(
      ({ selectQuery }: { selectQuery: string }) =>
        useGalaxyFocusAndSelection({
          urlFocusSlug: null,
          storeFocusedEntity: null,
          apertureCorpus: corpus,
          activeCorpus: corpus,
          storeSelected: [],
          layerIndex: [],
          loadedLayers: [],
          selectQuery,
        }),
      { initialProps: { selectQuery: '' } },
    );

    const firstCanvasEntities = result.current.canvasEntities;
    expect(firstCanvasEntities).toEqual([]);

    rerender({ selectQuery: '' });
    expect(result.current.canvasEntities).toBe(firstCanvasEntities);
  });
});
