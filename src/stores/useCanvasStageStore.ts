import { create } from 'zustand';
import type { CanvasLayerProps } from '../components/domain/CanvasLayer/CanvasLayer';

export interface CanvasStageState {
  readonly isRootCanvasMounted: boolean;
  readonly activeSlotCount: number;
  readonly stageProps: CanvasLayerProps | null;
}

export interface CanvasStageActions {
  readonly setRootCanvasMounted: (mounted: boolean) => void;
  readonly mountSlot: () => void;
  readonly unmountSlot: () => void;
  readonly setStageProps: (props: CanvasLayerProps) => void;
  readonly clearStageProps: () => void;
  readonly resetCanvasStageStore: () => void;
}

export type CanvasStageStore = CanvasStageState & CanvasStageActions;

export const INITIAL_CANVAS_STAGE_STATE: CanvasStageState = {
  isRootCanvasMounted: false,
  activeSlotCount: 0,
  stageProps: null,
};

export const useCanvasStageStore = create<CanvasStageStore>()((set) => ({
  ...INITIAL_CANVAS_STAGE_STATE,
  setRootCanvasMounted: (isRootCanvasMounted: boolean) => set({ isRootCanvasMounted }),
  mountSlot: () => set((state) => ({ activeSlotCount: state.activeSlotCount + 1 })),
  unmountSlot: () =>
    set((state) => ({ activeSlotCount: Math.max(0, state.activeSlotCount - 1) })),
  setStageProps: (stageProps: CanvasLayerProps) => set({ stageProps }),
  clearStageProps: () => set({ stageProps: null }),
  resetCanvasStageStore: () => set({ ...INITIAL_CANVAS_STAGE_STATE }),
}));
