import { create } from 'zustand';
import type { CardinalDirection } from '../components/canvas/math/cameraMath';

export type CameraProjectionMode = 'perspective' | 'orthographic';

export interface CameraState {
  /** Current projection mode: 3D perspective or orthogonal flat cartography */
  mode: CameraProjectionMode;
  /** Whether the camera is locked into its active orthographic orientation */
  isLocked: boolean;
  /** Active cardinal direction when aligned or requested */
  activeCardinal: CardinalDirection | null;
  /** Current camera position in world space */
  position: [number, number, number];
  /** Current focal target (orbit center) in world space */
  target: [number, number, number];
  /** Current focal distance (distance from position to target) */
  focalDistance: number;
  /** Orthographic camera zoom factor or perspective baseline zoom */
  zoom: number;
  /** Pending programmatic axis navigation request */
  pendingAxisRequest: CardinalDirection | null;
}

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
  requestAxisView: (direction: CardinalDirection) => void;
  clearAxisRequest: () => void;
  resetCameraState: () => void;
}

export type CameraStore = CameraState & CameraActions;

export const INITIAL_CAMERA_STATE: CameraState = {
  mode: 'perspective',
  isLocked: false,
  activeCardinal: null,
  position: [0, 0, 10],
  target: [0, 0, 0],
  focalDistance: 10,
  zoom: 1.0,
  pendingAxisRequest: null,
};

export const useCameraStore = create<CameraStore>()((set) => ({
  ...INITIAL_CAMERA_STATE,
  setMode: (mode: CameraProjectionMode) => set({ mode }),
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
  setActiveCardinal: (activeCardinal: CardinalDirection | null) => set({ activeCardinal }),
  setCameraTransform: (
    position: [number, number, number],
    target: [number, number, number],
    zoom?: number,
  ) =>
    set({
      position,
      target,
      focalDistance: Math.hypot(
        position[0] - target[0],
        position[1] - target[1],
        position[2] - target[2],
      ),
      ...(zoom !== undefined ? { zoom } : {}),
    }),
  requestAxisView: (direction: CardinalDirection) => set({ pendingAxisRequest: direction }),
  clearAxisRequest: () => set({ pendingAxisRequest: null }),
  resetCameraState: () => set({ ...INITIAL_CAMERA_STATE }),
}));
