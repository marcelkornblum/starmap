import { create } from 'zustand';
import { fetchLayerIndex } from '../data/layerRepository';
import type { DatasetLayerIndexEntry } from '../types/astro';

export type LayerIndexStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LayerState {
  index: readonly DatasetLayerIndexEntry[];
  status: LayerIndexStatus;
}

export interface LayerActions {
  loadIndex: (fetchImpl?: typeof fetch) => Promise<void>;
}

export type LayerStore = LayerState & LayerActions;

export const useLayerStore = create<LayerStore>()((set) => ({
  index: [],
  status: 'idle',
  loadIndex: async (fetchImpl?: typeof fetch) => {
    set({ status: 'loading' });
    try {
      const index = await fetchLayerIndex(fetchImpl);
      set({ index, status: 'ready' });
    } catch {
      set({ index: [], status: 'error' });
    }
  },
}));
