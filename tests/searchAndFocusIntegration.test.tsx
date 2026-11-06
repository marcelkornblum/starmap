// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import { GalaxyView } from '../src/views/GalaxyView';
import { useUIStore } from '../src/stores/useUIStore';
import { useCameraStore } from '../src/stores/useCameraStore';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children, 'data-testid': testId }: { children: React.ReactNode; 'data-testid'?: string }) =>
      createElement('div', { 'data-testid': testId ?? 'drei-html' }, children),
    OrbitControls: () => createElement('div', { 'data-testid': 'orbit-controls' }),
    Sphere: ({ children }: { children?: React.ReactNode }) =>
      createElement('mesh', null, children),
  };
});

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children }: { children?: React.ReactNode }) =>
      createElement('div', { 'data-testid': 'mock-canvas' }, children),
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      controls: {
        target: new THREE.Vector3(),
        update: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    }),
  };
});

const SAMPLE_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    k: 1,
    p: [0, 0, 0],
    m: [-26.74, 'G2V', 8, 1],
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    k: 1,
    p: [-1.6, 2.5, -2.4],
    m: [3.5, 'G8.5V', 4, 1],
  },
];

describe('Search and Focus Integration - Infinite Render Loop Regression', () => {
  beforeEach(() => {
    useUIStore.getState().resetUIState();
    useCameraStore.getState().resetCameraState();
  });

  it('renders GalaxyView with ?focus=tau-ceti without throwing Maximum update depth exceeded when already registered', () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntity({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: [-1.6, 2.5, -2.4],
      classification: 'star',
      spectralType: 'G8.5V',
    });

    let renderedResult: ReturnType<typeof render> | undefined;
    expect(() => {
      renderedResult = render(
        <SpatialEntityProvider store={store}>
          <GalaxyView
            initialCorpus={SAMPLE_CORPUS}
            locationPathname="/galaxy"
            locationSearch="?focus=tau-ceti"
          />
        </SpatialEntityProvider>,
      );
    }).not.toThrow();

    expect(screen.getByTestId('galaxy-view-root')).toBeDefined();
    expect(store.getState().focusedId).toBe('tau-ceti');
    expect(screen.getAllByText('Tau Ceti').length).toBeGreaterThan(0);

    renderedResult?.unmount();
  });

  it('updateEntity bails out and returns identical state reference when properties are unchanged', () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntity({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: [-1.6, 2.5, -2.4],
      classification: 'star',
      spectralType: 'G8.5V',
    });

    const stateBefore = store.getState();
    store.getState().updateEntity('tau-ceti', {
      name: 'Tau Ceti',
      classification: 'star',
      spectralType: 'G8.5V',
      position: [-1.6, 2.5, -2.4],
    });
    const stateAfter = store.getState();

    expect(stateAfter).toBe(stateBefore);
    expect(stateAfter.entities).toBe(stateBefore.entities);
    expect(stateAfter.entities['tau-ceti']).toBe(stateBefore.entities['tau-ceti']);
  });

  it('updateEntity updates entity and returns new state reference when properties change', () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntity({
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: [-1.6, 2.5, -2.4],
      classification: 'star',
      spectralType: 'G8.5V',
    });

    const stateBefore = store.getState();
    store.getState().updateEntity('tau-ceti', {
      name: 'Tau Ceti Prime',
    });
    const stateAfter = store.getState();

    expect(stateAfter).not.toBe(stateBefore);
    expect(stateAfter.entities['tau-ceti'].name).toBe('Tau Ceti Prime');
  });
});
