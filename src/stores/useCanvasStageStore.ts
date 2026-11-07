import { create } from 'zustand';

export interface CanvasStageData<
  TEntity = unknown,
  TLeg = unknown,
> {
  readonly scope: 'galaxy' | 'system' | 'planet';
  readonly targetId?: string;
  readonly centerId?: string;
  readonly centerCoordinates?: readonly [number, number, number];
  readonly selectedEntities?: readonly TEntity[];
  readonly cameraAzimuthDeg?: number;
  readonly cameraElevationDeg?: number;
  readonly cameraDistance?: number;
  readonly journeyLegs?: readonly TLeg[];
  readonly activeJourneyMethod?: string;
  readonly activeSystemName?: string;
  readonly focusedTargetName?: string;
  readonly routeWaypoints?: readonly string[];
  readonly cameraState?: Record<string, unknown>;
}

export interface CanvasStageCallbacks {
  readonly onInspect?: (id: string) => void;
  readonly onSelect?: (id: string | null) => void;
}

let stageCallbacks: CanvasStageCallbacks = {};

export function setStageCallbacks(callbacks: CanvasStageCallbacks): void {
  stageCallbacks = callbacks;
}

export function getStageCallbacks(): CanvasStageCallbacks {
  return stageCallbacks;
}

export interface CanvasStageState {
  readonly isRootCanvasMounted: boolean;
  readonly activeSlotCount: number;
  readonly stageProps: CanvasStageData | null;
}

export interface CanvasStageActions {
  readonly setRootCanvasMounted: (mounted: boolean) => void;
  readonly mountSlot: () => void;
  readonly unmountSlot: () => void;
  readonly setStageProps: (props: CanvasStageData) => void;
  readonly clearStageProps: () => void;
  readonly resetCanvasStageStore: () => void;
}

export type CanvasStageStore = CanvasStageState & CanvasStageActions;

export const INITIAL_CANVAS_STAGE_STATE: CanvasStageState = {
  isRootCanvasMounted: false,
  activeSlotCount: 0,
  stageProps: null,
};

function sanitizeStageProps(props: CanvasStageData | (CanvasStageData & Record<string, unknown>)): CanvasStageData {
  const {
    scope,
    targetId,
    centerId,
    centerCoordinates,
    selectedEntities,
    cameraAzimuthDeg,
    cameraElevationDeg,
    cameraDistance,
    journeyLegs,
    activeJourneyMethod,
    activeSystemName,
    focusedTargetName,
    routeWaypoints,
    cameraState,
  } = props;

  return {
    scope,
    ...(targetId !== undefined ? { targetId } : {}),
    ...(centerId !== undefined ? { centerId } : {}),
    ...(centerCoordinates !== undefined ? { centerCoordinates } : {}),
    ...(selectedEntities !== undefined ? { selectedEntities } : {}),
    ...(cameraAzimuthDeg !== undefined ? { cameraAzimuthDeg } : {}),
    ...(cameraElevationDeg !== undefined ? { cameraElevationDeg } : {}),
    ...(cameraDistance !== undefined ? { cameraDistance } : {}),
    ...(journeyLegs !== undefined ? { journeyLegs } : {}),
    ...(activeJourneyMethod !== undefined ? { activeJourneyMethod } : {}),
    ...(activeSystemName !== undefined ? { activeSystemName } : {}),
    ...(focusedTargetName !== undefined ? { focusedTargetName } : {}),
    ...(routeWaypoints !== undefined ? { routeWaypoints } : {}),
    ...(cameraState !== undefined ? { cameraState } : {}),
  };
}

export const useCanvasStageStore = create<CanvasStageStore>()((set) => ({
  ...INITIAL_CANVAS_STAGE_STATE,
  setRootCanvasMounted: (isRootCanvasMounted: boolean) => set({ isRootCanvasMounted }),
  mountSlot: () => set((state) => ({ activeSlotCount: state.activeSlotCount + 1 })),
  unmountSlot: () =>
    set((state) => ({ activeSlotCount: Math.max(0, state.activeSlotCount - 1) })),
  setStageProps: (props: CanvasStageData) =>
    set({ stageProps: sanitizeStageProps(props) }),
  clearStageProps: () => {
    stageCallbacks = {};
    set({ stageProps: null });
  },
  resetCanvasStageStore: () => {
    stageCallbacks = {};
    set({ ...INITIAL_CANVAS_STAGE_STATE });
  },
}));
