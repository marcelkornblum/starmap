import type React from 'react';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useThreeTokenStore } from '../../stores/useThreeTokenStore';
import { useThemeTokenSync } from './useThemeTokenSync';

/**
 * DOM-side synchronization bridge component.
 * Mount inside the application shell or Storybook decorator.
 */
export const ThemeTokenBridge: React.FC = () => {
  useThemeTokenSync();
  return null;
};

/**
 * WebGL / Three.js-side synchronization bridge component.
 * Mount inside the R3F <Canvas> tree to update clear colour and scene background.
 */
export const SceneTokenBridge: React.FC = () => {
  const { gl } = useThree();
  const tokens = useThreeTokenStore((state) => state.tokens);

  useEffect(() => {
    if (!gl) return;
    gl.setClearColor(tokens.canvasBg, tokens.canvasOpacity);
  }, [gl, tokens.canvasBg, tokens.canvasOpacity]);

  if (tokens.canvasOpacity <= 0) {
    return null;
  }

  return <color attach="background" args={[tokens.canvasBg.r, tokens.canvasBg.g, tokens.canvasBg.b]} />;
};
