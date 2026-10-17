import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ThemeTokenBridge } from '../../src/components/canvas/ThemeTokenBridge';
import { SafeHtmlPortalOutlet } from '../../src/components/canvas/SafeHtml';
import {
  type ReferenceFrame,
  GALACTIC_FRAME,
} from '../../src/components/canvas/instrument/referenceFrame';
import { getStandardInitialCamera } from '../../src/components/canvas/cartography/cartographyMath';
import { CONTROLS_DAMPING_FACTOR } from '../../src/components/canvas/engineConfig';
import styles from './StoryCanvas.module.css';

export interface StoryCanvasProps {
  /** Story header title */
  title?: string;
  /** Story header usage and purpose description */
  description?: string;
  /** Reference frame driving camera defaults, distance bounds, and lighting. Defaults to GALACTIC_FRAME */
  frame?: ReferenceFrame;
  /** Explicit camera position override */
  cameraPosition?: [number, number, number];
  /** Explicit camera target override */
  cameraTarget?: [number, number, number];
  /** Explicit camera distance override */
  cameraDistance?: number;
  /** Explicit FOV override */
  fov?: number;
  /** Whether to mount OrbitControls (default: true) */
  enableControls?: boolean;
  /** Custom controls ref */
  controlsRef?: React.Ref<OrbitControlsImpl>;
  /** Content rendered inside the story banner card (e.g. diagnostic controls) */
  bannerContent?: React.ReactNode;
  /** Optional DOM overlay rendered above the canvas (e.g. diagnostics, HUD, story controls) */
  overlay?: React.ReactNode;
  /** Canvas child elements */
  children?: React.ReactNode;
  /** Extra class names applied to the container */
  className?: string;
  /** Pointer missed callback */
  onPointerMissed?: () => void;
}

/**
 * StoryCanvas: Shared Canonical Canvas Wrapper for Storybook Stories and Prototypes.
 * Harmonises container sizing, ThemeTokenBridge, OrbitControls with frame-driven min/max distances,
 * and standard camera orientation.
 */
export const StoryCanvas: React.FC<StoryCanvasProps> = ({
  title,
  description,
  frame = GALACTIC_FRAME,
  cameraPosition,
  cameraTarget,
  cameraDistance,
  fov,
  enableControls = true,
  controlsRef,
  bannerContent,
  overlay,
  children,
  className,
  onPointerMissed,
}) => {
  const effectiveDistance =
    cameraDistance ?? frame.radius * frame.referenceDistanceMultiplier;
  const effectiveTarget = cameraTarget ?? frame.camera.defaultTarget;
  const effectiveFov = fov ?? frame.camera.baseFov;

  const cam = useMemo(() => {
    const standardSetup = getStandardInitialCamera(
      effectiveDistance,
      effectiveTarget,
      effectiveFov,
    );
    if (cameraPosition) {
      return {
        ...standardSetup,
        position: cameraPosition,
      };
    }
    return standardSetup;
  }, [
    effectiveDistance,
    effectiveTarget,
    effectiveFov,
    cameraPosition,
  ]);

  const canvasCamera = useMemo(
    () => ({
      position: cam.position,
      up: cam.up,
      fov: cam.fov,
    }),
    [cam.position, cam.up, cam.fov],
  );

  return (
    <div
      data-testid="story-canvas-container"
      className={[styles.canvasContainer, className].filter(Boolean).join(' ')}
    >
      {(title || description || bannerContent) && (
        <div className={styles.storyBanner}>
          {title && <h2 className={styles.storyTitle}>{title}</h2>}
          {description && <p className={styles.storyDescription}>{description}</p>}
          {bannerContent}
        </div>
      )}
      <Canvas
        flat
        camera={canvasCamera}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={onPointerMissed}
      >
        <ThemeTokenBridge />
        {enableControls && (
          <OrbitControlsBridge
            controlsRef={controlsRef}
            target={cam.target}
            minDistance={frame.camera.minDistance}
            maxDistance={frame.camera.maxDistance}
          />
        )}
        {children}
      </Canvas>
      <SafeHtmlPortalOutlet />
      {overlay}
    </div>
  );
};

interface OrbitControlsBridgeProps {
  controlsRef?: React.Ref<OrbitControlsImpl>;
  target: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
}

const OrbitControlsBridge: React.FC<OrbitControlsBridgeProps> = ({
  controlsRef,
  target,
  minDistance,
  maxDistance,
}) => {
  const threeCamera = useThree((s) => s.camera);
  const stableCameraRef = useRef(threeCamera);
  const internalRef = useRef<OrbitControlsImpl>(null);
  const prevTargetRef = useRef<[number, number, number] | null>(null);

  // Initialise target once, and only update if explicit prop coordinates change
  useEffect(() => {
    const controls = internalRef.current;
    if (!controls) return;
    const prev = prevTargetRef.current;
    if (!prev || prev[0] !== target[0] || prev[1] !== target[1] || prev[2] !== target[2]) {
      controls.target.set(target[0], target[1], target[2]);
      controls.update();
      prevTargetRef.current = [target[0], target[1], target[2]];
    }
  }, [target]);

  const setControlsRef = (instance: OrbitControlsImpl | null) => {
    (internalRef as React.MutableRefObject<OrbitControlsImpl | null>).current = instance;
    if (controlsRef) {
      if (typeof controlsRef === 'function') {
        controlsRef(instance);
      } else {
        (controlsRef as React.MutableRefObject<OrbitControlsImpl | null>).current = instance;
      }
    }
  };

  return (
    <OrbitControls
      ref={setControlsRef}
      camera={stableCameraRef.current}
      makeDefault
      enablePan={true}
      screenSpacePanning={true}
      dampingFactor={CONTROLS_DAMPING_FACTOR}
      minDistance={minDistance}
      maxDistance={maxDistance}
    />
  );
};
