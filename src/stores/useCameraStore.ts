import { create } from 'zustand';
import type { CardinalDirection } from '../types/spatial';
import { setPendingSpatialNavigationHref } from '../utils/spatialRoute';

export type CameraProjectionMode = 'perspective' | 'orthographic';

export type CanvasClampEdge = 'top' | 'right' | 'bottom' | 'left';
export const ALL_CANVAS_CLAMP_EDGES: readonly CanvasClampEdge[] = ['top', 'right', 'bottom', 'left'];
export interface CanvasClampBumpEvent {
  readonly edges: readonly CanvasClampEdge[];
  readonly reason: 'zoom-out' | 'pan';
  readonly impulse: number;
  readonly seq: number;
}

export interface PreSearchOrigin {
  readonly pathname: string;
  readonly search: string;
  readonly target: readonly [number, number, number];
  readonly distance: number;
}

export interface SavedGalaxyCameraPose {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  zoom: number;
  focalDistance: number;
  centerKey: string;
}

export interface SearchFrameRequest {
  readonly target: readonly [number, number, number];
  readonly distance: number;
  readonly tick: number;
}

export interface CameraState {
  /** Current projection mode: 3D perspective or orthogonal flat cartography */
  mode: CameraProjectionMode;
  /** Whether the camera is locked into its active orthographic orientation */
  isLocked: boolean;
  /** Active cardinal direction when aligned or requested */
  activeCardinal: CardinalDirection | null;
  /** Current camera position in world space */
  position: [number, number, number];
  /** Current focal target (orbit centre) in world space */
  target: [number, number, number];
  /** Current camera up vector in world space */
  up: [number, number, number];
  /** Current focal distance (distance from position to target) */
  focalDistance: number;
  /** Orthographic camera zoom factor or perspective baseline zoom */
  zoom: number;
  /** Pending programmatic axis navigation request */
  pendingAxisRequest: CardinalDirection | null;
  /** Pending programmatic preset request */
  pendingPresetRequest: CameraPreset | null;
  /** Incremental tick counter triggering camera recentering onto target even when target coordinates are unchanged */
  recenterTick: number;
  /** Saved galaxy camera pose for state restoration when navigating back from system/planet views */
  savedGalaxyCamera: SavedGalaxyCameraPose | null;
  /** Last galaxy URL search parameters to preserve query on back/breadcrumbs navigation */
  lastGalaxySearch: string;
  /** Pending focus slug to center the camera upon (e.g. from search result selection) */
  pendingCenterSlug: string | null;
  /** Pending galactic bounding-sphere framing request from settled search results */
  pendingSearchFrame: SearchFrameRequest | null;
  /** Transient in-flight optimistic focus slug during navigation transitions */
  inFlightFocusSlug: string | null | undefined;
  /** Set of entity slugs focused directly via canvas interaction (prevents unwanted recentring) */
  canvasFocusedSlugs: ReadonlySet<string>;
  /** Saved pre-search spatial origin across cross-scale search transitions */
  preSearchOrigin: PreSearchOrigin | null;
  /** One-shot flag indicating cross-scale search navigation should restore search focus */
  pendingViewTransitionFocus: boolean;
  /** Latest canvas boundary clamp bump event (zoom-out ceiling or directional pan clamp) */
  clampBump: CanvasClampBumpEvent | null;
}

export type CameraPreset = 'top-down' | 'reset' | 'orbital-lock' | 'radial';

export interface CameraActions {
  setMode: (mode: CameraProjectionMode) => void;
  setLocked: (isLocked: boolean) => void;
  toggleLock: () => void;
  setActiveCardinal: (cardinal: CardinalDirection | null) => void;
  setCameraTransform: (
    position: [number, number, number],
    target: [number, number, number],
    zoom?: number,
  ) => void;
  setCameraPose: (pose: {
    position: [number, number, number];
    target: [number, number, number];
    up?: [number, number, number];
    zoom?: number;
    focalDistance?: number;
  }) => void;
  setSavedGalaxyCamera: (pose: SavedGalaxyCameraPose | null) => void;
  setLastGalaxySearch: (search: string) => void;
  setPendingCenterSlug: (slug: string | null) => void;
  requestSearchFrame: (target: readonly [number, number, number], distance: number) => void;
  clearSearchFrame: () => void;
  setInFlightFocusSlug: (slug: string | null | undefined) => void;
  focusFromSearch: (
    pendingCenterSlug: string,
    options?: { triggerRecenter?: boolean },
  ) => void;
  setPreSearchOrigin: (origin: PreSearchOrigin) => void;
  clearPreSearchOrigin: () => void;
  markSearchFocusForViewTransition: () => void;
  consumeSearchFocusForViewTransition: () => boolean;
  recordCanvasFocus: (slugOrSlugs: string | readonly string[]) => void;
  clearCanvasFocus: () => void;
  requestAxisView: (direction: CardinalDirection) => void;
  clearAxisRequest: () => void;
  applyPreset: (preset: CameraPreset) => void;
  clearPresetRequest: () => void;
  setTopDownView: () => void;
  resetView: () => void;
  setOrbitalLockView: () => void;
  setRadialView: () => void;
  triggerRecenter: () => void;
  triggerClampBump: (edges: readonly CanvasClampEdge[], reason: 'zoom-out' | 'pan', impulse?: number) => void;
  reset: () => void;
}

export type CameraStore = CameraState & CameraActions;

export const INITIAL_CAMERA_STATE: CameraState = {
  mode: 'perspective',
  isLocked: false,
  activeCardinal: null,
  position: [0, 0, 10],
  target: [0, 0, 0],
  up: [0, 1, 0],
  focalDistance: 10,
  zoom: 1.0,
  pendingAxisRequest: null,
  pendingPresetRequest: null,
  recenterTick: 0,
  savedGalaxyCamera: null,
  lastGalaxySearch: '',
  pendingCenterSlug: null,
  pendingSearchFrame: null,
  inFlightFocusSlug: undefined,
  canvasFocusedSlugs: new Set<string>(),
  preSearchOrigin: null,
  pendingViewTransitionFocus: false,
  clampBump: null,
};

let nextSearchFrameTick = 0;
let nextClampBumpSeq = 0;
const reuseTuple = (
  prev: [number, number, number],
  next: [number, number, number],
): [number, number, number] =>
  prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2] ? prev : next;

export const useCameraStore = create<CameraStore>()((set, get) => ({
  ...INITIAL_CAMERA_STATE,
  setMode: (mode: CameraProjectionMode) =>
    set((state) => (state.mode === mode ? state : { mode })),
  setLocked: (isLocked: boolean) =>
    set(() =>
      isLocked
        ? { isLocked: true, mode: 'orthographic' }
        : { isLocked: false, mode: 'perspective', activeCardinal: null },
    ),
  toggleLock: () =>
    set((state) =>
      state.isLocked
        ? { isLocked: false, mode: 'perspective', activeCardinal: null }
        : { isLocked: true, mode: 'orthographic' },
    ),
  setActiveCardinal: (activeCardinal: CardinalDirection | null) =>
    set((state) =>
      state.activeCardinal === activeCardinal ? state : { activeCardinal },
    ),
  setCameraTransform: (position: [number, number, number], target: [number, number, number], zoom?: number) =>
    set((state) => ({
      position: reuseTuple(state.position, position),
      target: reuseTuple(state.target, target),
      focalDistance: Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]),
      ...(zoom !== undefined ? { zoom } : {}),
    })),
  setCameraPose: (pose: {
    position: [number, number, number];
    target: [number, number, number];
    up?: [number, number, number];
    zoom?: number;
    focalDistance?: number;
  }) =>
    set((state) => ({
      position: reuseTuple(state.position, pose.position),
      target: reuseTuple(state.target, pose.target),
      ...(pose.up !== undefined ? { up: reuseTuple(state.up, pose.up) } : {}),
      focalDistance:
        pose.focalDistance ??
        Math.hypot(pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]),
      ...(pose.zoom !== undefined ? { zoom: pose.zoom } : {}),
    })),
  setSavedGalaxyCamera: (savedGalaxyCamera: SavedGalaxyCameraPose | null) =>
    set({ savedGalaxyCamera }),
  setLastGalaxySearch: (lastGalaxySearch: string) =>
    set((state) =>
      state.lastGalaxySearch === lastGalaxySearch ? state : { lastGalaxySearch },
    ),
  setPendingCenterSlug: (pendingCenterSlug: string | null) =>
    set((state) =>
      state.pendingCenterSlug === pendingCenterSlug
        ? state
        : { pendingCenterSlug },
    ),
  requestSearchFrame: (target: readonly [number, number, number], distance: number) => {
    nextSearchFrameTick += 1;
    const tick = nextSearchFrameTick;
    set({
      pendingSearchFrame: {
        target: [target[0], target[1], target[2]],
        distance,
        tick,
      },
    });
  },
  clearSearchFrame: () =>
    set((state) =>
      state.pendingSearchFrame === null ? state : { pendingSearchFrame: null },
    ),
  setInFlightFocusSlug: (inFlightFocusSlug: string | null | undefined) =>
    set((state) =>
      state.inFlightFocusSlug === inFlightFocusSlug
        ? state
        : { inFlightFocusSlug },
    ),
  focusFromSearch: (
    pendingCenterSlug: string,
    options?: { triggerRecenter?: boolean },
  ) =>
    set((state) => ({
      canvasFocusedSlugs:
        state.canvasFocusedSlugs.size === 0 ? state.canvasFocusedSlugs : new Set<string>(),
      pendingCenterSlug,
      inFlightFocusSlug: undefined,
      ...(options?.triggerRecenter === false
        ? {}
        : { recenterTick: state.recenterTick + 1 }),
    })),
  setPreSearchOrigin: (origin: PreSearchOrigin) =>
    set({
      preSearchOrigin: {
        pathname: origin.pathname,
        search: origin.search,
        target: [origin.target[0], origin.target[1], origin.target[2]],
        distance: origin.distance,
      },
    }),
  clearPreSearchOrigin: () =>
    set((state) =>
      state.preSearchOrigin === null ? state : { preSearchOrigin: null },
    ),
  markSearchFocusForViewTransition: () =>
    set((state) =>
      state.pendingViewTransitionFocus ? state : { pendingViewTransitionFocus: true },
    ),
  consumeSearchFocusForViewTransition: () => {
    if (!get().pendingViewTransitionFocus) {
      return false;
    }
    set({ pendingViewTransitionFocus: false });
    return true;
  },
  recordCanvasFocus: (slugOrSlugs: string | readonly string[]) =>
    set((state) => {
      const slugs = Array.isArray(slugOrSlugs) ? slugOrSlugs : [slugOrSlugs];
      const validSlugs = slugs.filter((s) => typeof s === 'string' && s.length > 0);
      if (validSlugs.length === 0) return state;
      if (validSlugs.every((s) => state.canvasFocusedSlugs.has(s))) {
        return state;
      }
      const next = new Set(state.canvasFocusedSlugs);
      for (const s of validSlugs) {
        next.add(s);
      }
      return { canvasFocusedSlugs: next };
    }),
  clearCanvasFocus: () =>
    set((state) =>
      state.canvasFocusedSlugs.size === 0
        ? state
        : { canvasFocusedSlugs: new Set<string>() },
    ),
  requestAxisView: (direction: CardinalDirection) => set({ pendingAxisRequest: direction }),
  clearAxisRequest: () => set({ pendingAxisRequest: null }),
  applyPreset: (preset: CameraPreset) => set({ pendingPresetRequest: preset }),
  clearPresetRequest: () => set({ pendingPresetRequest: null }),
  setTopDownView: () => set({ pendingPresetRequest: 'top-down' }),
  resetView: () => set({ pendingPresetRequest: 'reset' }),
  setOrbitalLockView: () => set({ pendingPresetRequest: 'orbital-lock' }),
  setRadialView: () => set({ pendingPresetRequest: 'radial' }),
  triggerRecenter: () => set((state) => ({ recenterTick: state.recenterTick + 1 })),
  triggerClampBump: (edges: readonly CanvasClampEdge[], reason: 'zoom-out' | 'pan', impulse = 1) => {
    if (edges.length === 0) return;
    const safeImpulse = Number.isFinite(impulse) && impulse > 0 ? impulse : 1;
    nextClampBumpSeq += 1;
    set({ clampBump: { edges: [...edges], reason, impulse: safeImpulse, seq: nextClampBumpSeq } });
  },
  reset: () => {
    nextSearchFrameTick = 0;
    nextClampBumpSeq = 0;
    setPendingSpatialNavigationHref(null);
    set({ ...INITIAL_CAMERA_STATE });
  },
}));
