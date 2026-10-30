import { create } from 'zustand';
import type { SystemSummaryNode } from '../types/astro';

export interface ActiveStarsState {
  /** Every star currently inside the instrument aperture, hydrated from streamed sectors (nearest first). */
  summaries: readonly SystemSummaryNode[];
}

export interface ActiveStarsActions {
  setSummaries: (summaries: readonly SystemSummaryNode[]) => void;
  clear: () => void;
}

export type ActiveStarsStore = ActiveStarsState & ActiveStarsActions;

const EMPTY_SUMMARIES: readonly SystemSummaryNode[] = Object.freeze([]);

/**
 * Bridges the canvas (which streams and hydrates sector stars) to DOM panels that must list
 * every active star, without routing thousands of entities through the spatial entity store.
 */
export const useActiveStarsStore = create<ActiveStarsStore>()((set) => ({
  summaries: EMPTY_SUMMARIES,
  setSummaries: (summaries) =>
    set((state) => {
      const prev = state.summaries;
      if (
        prev.length === summaries.length &&
        prev.every((s, idx) => s.id === summaries[idx]?.id)
      ) {
        return state;
      }
      return { summaries };
    }),
  clear: () => set((state) => (state.summaries === EMPTY_SUMMARIES ? state : { summaries: EMPTY_SUMMARIES })),
}));
