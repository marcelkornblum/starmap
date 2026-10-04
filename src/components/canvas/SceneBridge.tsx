import React, { useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { SceneContext, useScene } from './SceneBridgeContext';

export interface SceneProviderProps {
  children: React.ReactNode;
}

interface SceneEntry {
  scene: React.ReactNode;
  key: string | null;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({ children }) => {
  const [entry, setEntry] = useState<SceneEntry>({
    scene: null,
    key: null,
  });

  const setScene = useCallback((scene: React.ReactNode, key?: string): void => {
    setEntry((prev) => {
      if (scene === null && key !== undefined) {
        if (prev.key === key) {
          return { scene: null, key: null };
        }
        return prev;
      }
      return { scene, key: key ?? null };
    });
  }, []);

  const contextValue = useMemo(
    () => ({ activeScene: entry.scene, activeSceneKey: entry.key, setScene }),
    [entry.scene, entry.key, setScene],
  );

  return (
    <SceneContext.Provider value={contextValue}>
      {children}
    </SceneContext.Provider>
  );
};

export interface ScenePortalProps {
  sceneKey: string;
  children?: React.ReactNode;
}

/**
 * Injects a 3D scene into the global canvas SceneOutlet.
 *
 * Note: `children` is included in the layout effect dependency array to ensure dynamic
 * portal content stays reactive without stale closures. Consumers should memoize the passed
 * scene element (e.g. via `useMemo`) if parent re-renders are frequent.
 */
export const ScenePortal: React.FC<ScenePortalProps> = ({ sceneKey, children }) => {
  const { setScene } = useScene();

  useLayoutEffect(() => {
    setScene(children, sceneKey);
    return () => {
      setScene(null, sceneKey);
    };
  }, [children, sceneKey, setScene]);

  return null;
};

export interface SceneOutletProps {}

export const SceneOutlet: React.FC<SceneOutletProps> = () => {
  const { activeScene } = useScene();
  return <>{activeScene}</>;
};

