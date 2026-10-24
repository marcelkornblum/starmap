import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLayerRepositoryCache } from '../src/data/layerRepository';
import { useLayerStore } from '../src/stores';
import { LAYER_INDEX_ENTRIES } from './layerFixtures';

const resetStore = () =>
  useLayerStore.setState({ index: [], status: 'idle' });

describe('useLayerStore', () => {
  beforeEach(() => {
    clearLayerRepositoryCache();
    resetStore();
  });

  it('starts idle with an empty index', () => {
    const state = useLayerStore.getState();
    expect(state.status).toBe('idle');
    expect(state.index).toEqual([]);
  });

  it('loadIndex transitions idle -> loading -> ready and stores the fetched index', async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ d: LAYER_INDEX_ENTRIES }),
        }) as unknown as Response,
    );

    const pending = useLayerStore.getState().loadIndex(fetchImpl);
    expect(useLayerStore.getState().status).toBe('loading');
    await pending;

    expect(useLayerStore.getState().status).toBe('ready');
    expect(useLayerStore.getState().index).toEqual(LAYER_INDEX_ENTRIES);
  });

  it('loadIndex sets status to error and keeps an empty index when the fetch fails', async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({ ok: false, status: 500, statusText: 'Boom' }) as unknown as Response,
    );

    await useLayerStore.getState().loadIndex(fetchImpl);

    expect(useLayerStore.getState().status).toBe('error');
    expect(useLayerStore.getState().index).toEqual([]);
  });
});
