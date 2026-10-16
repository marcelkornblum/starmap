import { createContext, useContext } from 'react';
import type React from 'react';
import { create } from 'zustand';

export interface SceneContextValue {
  activeScene: React.ReactNode;
  activeSceneKey: string | null;
  setScene: (scene: React.ReactNode, key?: string) => void;
}

export const useSceneStore = create<SceneContextValue>((set) => ({
  activeScene: null,
  activeSceneKey: null,
  setScene: (scene, key) =>
    set((prev) => {
      if (scene === null && key !== undefined) {
        if (prev.activeSceneKey === key) {
          return { activeScene: null, activeSceneKey: null };
        }
        return prev;
      }
      return { activeScene: scene, activeSceneKey: key ?? null };
    }),
}));

export const SceneContext = createContext<SceneContextValue | null>(null);

export const useScene = (): SceneContextValue => {
  const ctx = useContext(SceneContext);
  const store = useSceneStore();
  if (ctx) {
    return ctx;
  }
  return store;
};
