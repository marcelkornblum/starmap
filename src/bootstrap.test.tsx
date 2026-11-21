import { act, within } from '@testing-library/react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYER_INDEX_ENTRIES } from '../tests/fixtures/layerFixtures';
import { useLayerIndex } from './hooks/useLayerData';
import { useLayerStore } from './stores/useLayerStore';
import { bootstrapApp } from './bootstrap';

vi.mock('./App', () => ({
  App: () => {
    const layers = useLayerIndex();
    return (
      <div data-testid="app-shell">
        <span data-testid="layer-count">{layers.length}</span>
      </div>
    );
  },
}));

describe('bootstrapApp', () => {
  let container: HTMLDivElement;
  let mountedRoot: Root | null = null;
  const originalLoadIndex = useLayerStore.getState().loadIndex;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    useLayerStore.setState({ index: [], status: 'idle', loadIndex: originalLoadIndex });
  });

  afterEach(async () => {
    await act(async () => {
      mountedRoot?.unmount();
    });
    mountedRoot = null;
    useLayerStore.setState({ index: [], status: 'idle', loadIndex: originalLoadIndex });
    container.remove();
    vi.restoreAllMocks();
  });

  it('does nothing when rootElement is null', () => {
    const loadIndexSpy = vi.fn(() => new Promise<void>(() => {}));
    useLayerStore.setState({ loadIndex: loadIndexSpy });

    mountedRoot = bootstrapApp(null);

    expect(mountedRoot).toBeNull();
    expect(loadIndexSpy).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });

  it('renders App immediately even when loadIndex never resolves and kicks off loadIndex on boot', async () => {
    const loadIndexSpy = vi.fn(() => new Promise<void>(() => {}));
    useLayerStore.setState({ loadIndex: loadIndexSpy });

    await act(async () => {
      mountedRoot = bootstrapApp(container);
    });

    expect(mountedRoot).not.toBeNull();
    expect(loadIndexSpy).toHaveBeenCalledTimes(1);
    const view = within(container);
    expect(view.getByTestId('app-shell')).toBeInTheDocument();
    expect(view.getByTestId('layer-count')).toHaveTextContent('0');
  });

  it('updates useLayerIndex subscribers automatically when loadIndex resolves asynchronously', async () => {
    let resolveLoad!: () => void;
    const loadIndexSpy = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    useLayerStore.setState({ loadIndex: loadIndexSpy });

    await act(async () => {
      mountedRoot = bootstrapApp(container);
    });

    const view = within(container);
    expect(view.getByTestId('layer-count')).toHaveTextContent('0');

    await act(async () => {
      useLayerStore.setState({ index: LAYER_INDEX_ENTRIES, status: 'ready' });
      resolveLoad();
    });

    expect(view.getByTestId('layer-count')).toHaveTextContent(
      String(LAYER_INDEX_ENTRIES.length),
    );
  });

  it('handles loadIndex rejection gracefully without throwing or unmounting App', async () => {
    const loadIndexSpy = vi.fn(async () => {
      throw new Error('Network failure');
    });
    useLayerStore.setState({ loadIndex: loadIndexSpy });

    await act(async () => {
      mountedRoot = bootstrapApp(container);
    });

    expect(loadIndexSpy).toHaveBeenCalledTimes(1);
    const view = within(container);
    expect(view.getByTestId('app-shell')).toBeInTheDocument();
    expect(view.getByTestId('layer-count')).toHaveTextContent('0');
  });
});
