import { createContext, useContext } from 'react';
import type React from 'react';

export interface SceneContextValue {
  activeScene: React.ReactNode;
  activeSceneKey: string | null;
  setScene: (scene: React.ReactNode, key?: string) => void;
}

export const SceneContext = createContext<SceneContextValue>({
  activeScene: null,
  activeSceneKey: null,
  setScene: () => {},
});

export const useScene = (): SceneContextValue => useContext(SceneContext);
