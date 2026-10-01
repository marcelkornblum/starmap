import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SceneContext, useScene } from './SceneBridgeContext';

export interface SceneProviderProps {
  children: React.ReactNode;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({ children }) => {
  const [activeScene, setActiveScene] = useState<React.ReactNode>(null);
  const [activeSceneKey, setActiveSceneKey] = useState<string | null>(null);

  const setScene = useCallback((scene: React.ReactNode, key?: string): void => {
    if (scene === null && key !== undefined) {
      setActiveSceneKey((currentKey) => {
        if (currentKey === key) {
          setActiveScene(null);
          return null;
        }
        return currentKey;
      });
      return;
    }

    setActiveScene(scene);
    setActiveSceneKey(key ?? null);
  }, []);

  const contextValue = useMemo(
    () => ({ activeScene, activeSceneKey, setScene }),
    [activeScene, activeSceneKey, setScene],
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

  useEffect(() => {
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

