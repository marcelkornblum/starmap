import { create } from 'zustand';

export type ActivePanel = 'details' | 'search' | 'settings' | 'filters' | null;

export interface EphemeralUIState {
  // Global ephemeral states
  isAudioPlaying: boolean;
  activePanel: ActivePanel;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  searchQuery: string;

  // View-level ephemeral states
  isCameraTransitioning: boolean;
}

export interface EphemeralUIActions {
  setAudioPlaying: (playing: boolean) => void;
  toggleAudio: () => void;
  setActivePanel: (panel: ActivePanel) => void;
  setHoveredNodeId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCameraTransitioning: (transitioning: boolean) => void;
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
  resetUI: () => set({ ...INITIAL_UI_STATE }),
}));
