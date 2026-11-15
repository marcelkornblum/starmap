import { create } from 'zustand';
import type { ThreeTokenSnapshot } from '../types/threeTokens';
import { DEFAULT_DARK_TOKEN_SNAPSHOT } from './threeTokenDefaults';

export interface ThreeTokenState {
  tokens: ThreeTokenSnapshot;
  setTokens: (tokens: ThreeTokenSnapshot) => void;
  resetTokens: () => void;
}

export const useThreeTokenStore = create<ThreeTokenState>((set) => ({
  tokens: DEFAULT_DARK_TOKEN_SNAPSHOT,
  setTokens: (tokens) => set({ tokens }),
  resetTokens: () => set({ tokens: DEFAULT_DARK_TOKEN_SNAPSHOT }),
}));
