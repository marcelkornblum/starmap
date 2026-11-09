import { create } from 'zustand';
import type {
  JourneyChordLeg,
  SpatialEntityDefinition,
} from '../types/spatial';

export interface CanvasStageData<
  TEntity = SpatialEntityDefinition,
  TLeg = JourneyChordLeg,
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
  readonly onFocusChange?: (id: string | null) => void;
}

const EMPTY_STAGE_CALLBACKS: CanvasStageCallbacks = {};
let stageCallbacks: CanvasStageCallbacks = EMPTY_STAGE_CALLBACKS;
const stageCallbackListeners = new Set<() => void>();

function notifyStageCallbackListeners(): void {
  for (const listener of stageCallbackListeners) {
    listener();
  }
}

export function setStageCallbacks(callbacks: CanvasStageCallbacks): void {
  if (
    stageCallbacks.onInspect === callbacks.onInspect &&
    stageCallbacks.onSelect === callbacks.onSelect &&
    stageCallbacks.onFocusChange === callbacks.onFocusChange
  ) {
    return;
  }
  stageCallbacks = callbacks;
  notifyStageCallbackListeners();
}

export function getStageCallbacks(): CanvasStageCallbacks {
  return stageCallbacks;
}

export function subscribeStageCallbacks(listener: () => void): () => void {
  stageCallbackListeners.add(listener);
  return () => {
    stageCallbackListeners.delete(listener);
  };
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

export const areStagePropsEqual = (
  a: CanvasStageData | null,
  b: CanvasStageData,
): boolean => {
  if (a === b) return true;
  if (!a) return false;
  if (
    a.scope !== b.scope ||
    a.targetId !== b.targetId ||
    a.centerId !== b.centerId ||
    a.cameraAzimuthDeg !== b.cameraAzimuthDeg ||
    a.cameraElevationDeg !== b.cameraElevationDeg ||
    a.cameraDistance !== b.cameraDistance ||
    a.activeJourneyMethod !== b.activeJourneyMethod ||
    a.activeSystemName !== b.activeSystemName ||
    a.focusedTargetName !== b.focusedTargetName
  ) {
    return false;
  }

  // centerCoordinates equality
  if (a.centerCoordinates !== b.centerCoordinates) {
    if (!a.centerCoordinates || !b.centerCoordinates) return false;
    if (
      a.centerCoordinates[0] !== b.centerCoordinates[0] ||
      a.centerCoordinates[1] !== b.centerCoordinates[1] ||
      a.centerCoordinates[2] !== b.centerCoordinates[2]
    ) {
      return false;
    }
  }

  // selectedEntities equality (compare IDs and count)
  if (a.selectedEntities !== b.selectedEntities) {
    if (!a.selectedEntities || !b.selectedEntities) return false;
    if (a.selectedEntities.length !== b.selectedEntities.length) return false;
    for (let i = 0; i < a.selectedEntities.length; i++) {
      if (a.selectedEntities[i].id !== b.selectedEntities[i].id) return false;
    }
  }

  // routeWaypoints equality
  if (a.routeWaypoints !== b.routeWaypoints) {
    if (!a.routeWaypoints || !b.routeWaypoints) return false;
    if (a.routeWaypoints.length !== b.routeWaypoints.length) return false;
    for (let i = 0; i < a.routeWaypoints.length; i++) {
      if (a.routeWaypoints[i] !== b.routeWaypoints[i]) return false;
    }
  }

  // journeyLegs equality
  if (a.journeyLegs !== b.journeyLegs) {
    if (!a.journeyLegs || !b.journeyLegs) return false;
    if (a.journeyLegs.length !== b.journeyLegs.length) return false;
    for (let i = 0; i < a.journeyLegs.length; i++) {
      if (
        a.journeyLegs[i].id !== b.journeyLegs[i].id ||
        a.journeyLegs[i].fromId !== b.journeyLegs[i].fromId ||
        a.journeyLegs[i].toId !== b.journeyLegs[i].toId
      ) {
        return false;
      }
    }
  }

  // cameraState equality
  if (a.cameraState !== b.cameraState) {
    if (!a.cameraState || !b.cameraState) return false;
    const aKeys = Object.keys(a.cameraState);
    const bKeys = Object.keys(b.cameraState);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a.cameraState[key] !== b.cameraState[key]) return false;
    }
  }

  return true;
};

export const useCanvasStageStore = create<CanvasStageStore>()((set) => ({
  ...INITIAL_CANVAS_STAGE_STATE,
  setRootCanvasMounted: (isRootCanvasMounted: boolean) => set({ isRootCanvasMounted }),
  mountSlot: () => set((state) => ({ activeSlotCount: state.activeSlotCount + 1 })),
  unmountSlot: () =>
    set((state) => ({ activeSlotCount: Math.max(0, state.activeSlotCount - 1) })),
  setStageProps: (props: CanvasStageData) =>
    set((state) => {
      const sanitized = sanitizeStageProps(props);
      if (areStagePropsEqual(state.stageProps, sanitized)) {
        return state;
      }
      return { stageProps: sanitized };
    }),
  clearStageProps: () => {
    setStageCallbacks(EMPTY_STAGE_CALLBACKS);
    set({ stageProps: null });
  },
  resetCanvasStageStore: () => {
    setStageCallbacks(EMPTY_STAGE_CALLBACKS);
    set({ ...INITIAL_CANVAS_STAGE_STATE });
  },
}));
