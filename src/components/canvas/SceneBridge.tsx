import React, { useState, useEffect } from 'react';
import { SceneContext, useScene } from './SceneBridgeContext';

export interface SceneProviderProps {
  children: React.ReactNode;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({ children }) => {
  const [activeScene, setActiveScene] = useState<React.ReactNode>(null);
  const [activeSceneKey, setActiveSceneKey] = useState<string | null>(null);

  const setScene = (scene: React.ReactNode, key?: string): void => {
    setActiveScene(scene);
    setActiveSceneKey(key ?? null);
  };

  return (
    <SceneContext.Provider value={{ activeScene, activeSceneKey, setScene }}>
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
      setScene(null, undefined);
    };
  }, [children, sceneKey, setScene]);

  return null;
};

export const SceneOutlet: React.FC = () => {
  const { activeScene } = useScene();
  return <>{activeScene}</>;
};
