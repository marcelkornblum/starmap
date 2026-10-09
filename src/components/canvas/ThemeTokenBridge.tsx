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

export interface SceneTokenBridgeProps {
  /** When true (default), preserves canvas transparency so prepended HTML overlays render behind WebGL objects */
  transparent?: boolean;
}

/**
 * WebGL / Three.js-side synchronization bridge component.
 * Mount inside the R3F <Canvas> tree to update clear colour and scene background.
 */
export const SceneTokenBridge: React.FC<SceneTokenBridgeProps> = ({ transparent = true }) => {
  const { gl } = useThree();
  const canvasBg = useThreeTokenStore((state) => state.tokens.canvasBg);
  const canvasOpacity = useThreeTokenStore((state) => state.tokens.canvasOpacity);

  useEffect(() => {
    if (!gl) return;
    if (transparent || canvasOpacity <= 0) {
      gl.setClearColor(0x000000, 0);
    } else {
      gl.setClearColor(canvasBg, canvasOpacity);
    }
  }, [gl, transparent, canvasBg, canvasOpacity]);

  if (transparent || canvasOpacity <= 0) {
    return null;
  }

  return <color attach="background" args={[canvasBg]} />;
};
