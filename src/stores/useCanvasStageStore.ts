import { create } from 'zustand';
import type { CanvasLayerProps } from '../components/domain/CanvasLayer/CanvasLayer';

export interface CanvasStageState {
  readonly isRootCanvasMounted: boolean;
  readonly stageProps: CanvasLayerProps | null;
}

export interface CanvasStageActions {
  readonly setRootCanvasMounted: (mounted: boolean) => void;
  readonly setStageProps: (props: CanvasLayerProps) => void;
  readonly clearStageProps: () => void;
  readonly resetCanvasStageStore: () => void;
}

export type CanvasStageStore = CanvasStageState & CanvasStageActions;

export const INITIAL_CANVAS_STAGE_STATE: CanvasStageState = {
  isRootCanvasMounted: false,
  stageProps: null,
};

export const useCanvasStageStore = create<CanvasStageStore>()((set) => ({
  ...INITIAL_CANVAS_STAGE_STATE,
  setRootCanvasMounted: (isRootCanvasMounted: boolean) => set({ isRootCanvasMounted }),
  setStageProps: (stageProps: CanvasLayerProps) => set({ stageProps }),
  clearStageProps: () => set({ stageProps: null }),
  resetCanvasStageStore: () => set({ ...INITIAL_CANVAS_STAGE_STATE }),
}));
