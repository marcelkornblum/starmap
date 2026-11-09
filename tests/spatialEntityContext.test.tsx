// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  useSpatialEntityStore,
  useSpatialEntityStoreApi,
  useOcclusionManager,
  SpatialEntityProvider,
} from '../src/components/canvas/entity/SpatialEntityContext';

describe('SpatialEntityContext Module Singleton Elimination (AUD-109)', () => {
  it('throws an error if useSpatialEntityStore is used outside <SpatialEntityProvider>', () => {
    expect(() => {
      renderHook(() => useSpatialEntityStore((s) => s.entities));
    }).toThrow('useSpatialEntityStore must be used within a <SpatialEntityProvider>');
  });

  it('throws an error if useSpatialEntityStoreApi is used outside <SpatialEntityProvider>', () => {
    expect(() => {
      renderHook(() => useSpatialEntityStoreApi());
    }).toThrow('useSpatialEntityStore must be used within a <SpatialEntityProvider>');
  });

  it('throws an error if useOcclusionManager is used outside <SpatialEntityProvider> or <OcclusionContext.Provider>', () => {
    expect(() => {
      renderHook(() => useOcclusionManager());
    }).toThrow('useOcclusionManager must be used within an <OcclusionContext.Provider> or <SpatialEntityProvider>');
  });

  it('provides scoped store and occlusion manager within <SpatialEntityProvider>', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SpatialEntityProvider>{children}</SpatialEntityProvider>
    );

    const { result: storeResult } = renderHook(() => useSpatialEntityStore((s) => s.entities), { wrapper });
    expect(storeResult.current).toBeDefined();

    const { result: apiResult } = renderHook(() => useSpatialEntityStoreApi(), { wrapper });
    expect(apiResult.current).toBeDefined();

    const { result: managerResult } = renderHook(() => useOcclusionManager(), { wrapper });
    expect(managerResult.current).toBeDefined();
  });
});
