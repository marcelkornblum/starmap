import { create } from 'zustand';

export type ActivePanel = 'details' | 'search' | 'settings' | 'filters' | null;

export type ActivePrimaryPanel = 'details' | 'directions' | null;
export type DetailsDetent = 'collapsed' | 'peek' | 'partial' | 'full';
export type DirectionsDetent = 'collapsed' | 'peek' | 'partial' | 'full';
export type PrimaryPanelPriority = 'details' | 'directions';
export type DualPanelPolicy = 'auto' | 'single' | 'simultaneous';
export type ActiveDrawer = 'bodies' | 'search' | 'settings' | 'filters' | null;

export interface EphemeralUIState {
  // Global ephemeral states
  isAudioPlaying: boolean;
  activePanel: ActivePanel;
  hoveredNodeId: string | null;

  // View-level ephemeral states
  isCameraTransitioning: boolean;

  // Panel lifecycle & UI shell states
  activePrimaryPanel: ActivePrimaryPanel;
  detailsDetent: DetailsDetent;
  isDetailsOpen: boolean;
  isDirectionsOpen: boolean;
  directionsDetent: DirectionsDetent;
  primaryPanelPriority: PrimaryPanelPriority;
  dualPanelPolicy: DualPanelPolicy;
  activeDrawer: ActiveDrawer;
  isLayerCardOpen: boolean;
}

export interface EphemeralUIActions {
  setAudioPlaying: (playing: boolean) => void;
  toggleAudio: () => void;
  setActivePanel: (panel: ActivePanel) => void;
  setHoveredNodeId: (id: string | null) => void;
  setCameraTransitioning: (transitioning: boolean) => void;
  setActivePrimaryPanel: (panel: ActivePrimaryPanel) => void;
  setDetailsDetent: (detent: DetailsDetent) => void;
  setDetailsOpen: (isOpen: boolean) => void;
  setDirectionsOpen: (isOpen: boolean) => void;
  setDirectionsDetent: (detent: DirectionsDetent) => void;
  setPrimaryPanelPriority: (priority: PrimaryPanelPriority) => void;
  setDualPanelPolicy: (policy: DualPanelPolicy) => void;
  setActiveDrawer: (drawer: ActiveDrawer) => void;
  toggleDrawer: (drawer: Exclude<ActiveDrawer, null>) => void;
  setLayerCardOpen: (isOpen: boolean) => void;
  resetUI: () => void;
}

export type UIStore = EphemeralUIState & EphemeralUIActions;

export const INITIAL_UI_STATE: EphemeralUIState = {
  isAudioPlaying: false,
  activePanel: null,
  hoveredNodeId: null,
  isCameraTransitioning: false,
  activePrimaryPanel: 'details',
  detailsDetent: 'peek',
  isDetailsOpen: true,
  isDirectionsOpen: true,
  directionsDetent: 'peek',
  primaryPanelPriority: 'directions',
  dualPanelPolicy: 'auto',
  activeDrawer: null,
  isLayerCardOpen: true,
};

export const useUIStore = create<UIStore>()((set) => ({
  ...INITIAL_UI_STATE,
  setAudioPlaying: (isAudioPlaying: boolean) => set({ isAudioPlaying }),
  toggleAudio: () => set((state) => ({ isAudioPlaying: !state.isAudioPlaying })),
  setActivePanel: (activePanel: ActivePanel) => set({ activePanel }),
  setHoveredNodeId: (hoveredNodeId: string | null) => set({ hoveredNodeId }),
  setCameraTransitioning: (isCameraTransitioning: boolean) => set({ isCameraTransitioning }),
  setActivePrimaryPanel: (activePrimaryPanel: ActivePrimaryPanel) => set({ activePrimaryPanel }),
  setDetailsDetent: (detailsDetent: DetailsDetent) => set({ detailsDetent }),
  setDetailsOpen: (isDetailsOpen: boolean) => set({ isDetailsOpen }),
  setDirectionsOpen: (isDirectionsOpen: boolean) => set({ isDirectionsOpen }),
  setDirectionsDetent: (directionsDetent: DirectionsDetent) => set({ directionsDetent }),
  setPrimaryPanelPriority: (primaryPanelPriority: PrimaryPanelPriority) => set({ primaryPanelPriority }),
  setDualPanelPolicy: (dualPanelPolicy: DualPanelPolicy) => set({ dualPanelPolicy }),
  setActiveDrawer: (activeDrawer: ActiveDrawer) => set({ activeDrawer }),
  toggleDrawer: (drawer: Exclude<ActiveDrawer, null>) =>
    set((state) => ({ activeDrawer: state.activeDrawer === drawer ? null : drawer })),
  setLayerCardOpen: (isLayerCardOpen: boolean) => set({ isLayerCardOpen }),
  resetUI: () => set({ ...INITIAL_UI_STATE }),
}));

