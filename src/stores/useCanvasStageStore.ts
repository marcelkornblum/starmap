import { create } from 'zustand';
import type {
  JourneyChordLeg,
  SpatialEntityDefinition,
} from '../types/spatial';
import { resetStageCallbacks } from './canvasStageCallbacks';

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
      if (a.selectedEntities[i]?.id !== b.selectedEntities[i]?.id) return false;
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
      const legA = a.journeyLegs[i];
      const legB = b.journeyLegs[i];
      if (
        !legA ||
        !legB ||
        legA.id !== legB.id ||
        legA.fromId !== legB.fromId ||
        legA.toId !== legB.toId
      ) {
        return false;
      }
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
    resetStageCallbacks();
    set({ stageProps: null });
  },
  resetCanvasStageStore: () => {
    resetStageCallbacks();
    set({ ...INITIAL_CANVAS_STAGE_STATE });
  },
}));
