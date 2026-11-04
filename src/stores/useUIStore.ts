import { create } from 'zustand';

export type ActivePanel = 'details' | 'search' | 'settings' | 'filters' | null;

export type ActivePrimaryPanel = 'details' | 'directions' | null;
export type DetailsDetent = 'collapsed' | 'peek' | 'partial' | 'full';
export type ActiveDrawer = 'bodies' | 'search' | 'settings' | 'filters' | null;

export interface EphemeralUIState {
  // Global ephemeral states
  isAudioPlaying: boolean;
  activePanel: ActivePanel;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  searchQuery: string;

  // View-level ephemeral states
  isCameraTransitioning: boolean;

  // Panel lifecycle & UI shell states
  activePrimaryPanel: ActivePrimaryPanel;
  detailsDetent: DetailsDetent;
  activeDrawer: ActiveDrawer;
  isLayerCardOpen: boolean;
  centeredEntityId: string | null;
}

export interface EphemeralUIActions {
  setAudioPlaying: (playing: boolean) => void;
  toggleAudio: () => void;
  setActivePanel: (panel: ActivePanel) => void;
  setHoveredNodeId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCameraTransitioning: (transitioning: boolean) => void;
  setActivePrimaryPanel: (panel: ActivePrimaryPanel) => void;
  setDetailsDetent: (detent: DetailsDetent) => void;
  setActiveDrawer: (drawer: ActiveDrawer) => void;
  toggleDrawer: (drawer: Exclude<ActiveDrawer, null>) => void;
  setLayerCardOpen: (isOpen: boolean) => void;
  setCenteredEntityId: (id: string | null) => void;
  resetUIState: () => void;
  resetUI: () => void;
}

export type UIStore = EphemeralUIState & EphemeralUIActions;

export const INITIAL_UI_STATE: EphemeralUIState = {
  isAudioPlaying: false,
  activePanel: null,
  hoveredNodeId: null,
  selectedNodeId: null,
  searchQuery: '',
  isCameraTransitioning: false,
  activePrimaryPanel: 'details',
  detailsDetent: 'peek',
  activeDrawer: null,
  isLayerCardOpen: true,
  centeredEntityId: null,
};

export const useUIStore = create<UIStore>()((set) => ({
  ...INITIAL_UI_STATE,
  setAudioPlaying: (isAudioPlaying: boolean) => set({ isAudioPlaying }),
  toggleAudio: () => set((state) => ({ isAudioPlaying: !state.isAudioPlaying })),
  setActivePanel: (activePanel: ActivePanel) => set({ activePanel }),
  setHoveredNodeId: (hoveredNodeId: string | null) => set({ hoveredNodeId }),
  setSelectedNodeId: (selectedNodeId: string | null) => set({ selectedNodeId }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setCameraTransitioning: (isCameraTransitioning: boolean) => set({ isCameraTransitioning }),
  setActivePrimaryPanel: (activePrimaryPanel: ActivePrimaryPanel) => set({ activePrimaryPanel }),
  setDetailsDetent: (detailsDetent: DetailsDetent) => set({ detailsDetent }),
  setActiveDrawer: (activeDrawer: ActiveDrawer) => set({ activeDrawer }),
  toggleDrawer: (drawer: Exclude<ActiveDrawer, null>) =>
    set((state) => ({ activeDrawer: state.activeDrawer === drawer ? null : drawer })),
  setLayerCardOpen: (isLayerCardOpen: boolean) => set({ isLayerCardOpen }),
  setCenteredEntityId: (centeredEntityId: string | null) => set({ centeredEntityId }),
  resetUIState: () => set({ ...INITIAL_UI_STATE }),
  resetUI: () => set({ ...INITIAL_UI_STATE }),
}));

