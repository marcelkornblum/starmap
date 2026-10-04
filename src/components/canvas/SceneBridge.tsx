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

export const ScenePortal: React.FC<ScenePortalProps> = ({ sceneKey, children }) => {
  const { setScene } = useScene();
  const childrenRef = React.useRef(children);
  childrenRef.current = children;

  useLayoutEffect(() => {
    setScene(childrenRef.current, sceneKey);
    return () => {
      setScene(null, sceneKey);
    };
  }, [sceneKey, setScene]);

  return null;
};

export interface SceneOutletProps {}

export const SceneOutlet: React.FC<SceneOutletProps> = () => {
  const { activeScene } = useScene();
  return <>{activeScene}</>;
};

