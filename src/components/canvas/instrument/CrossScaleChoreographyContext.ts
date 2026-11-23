import { createContext, createElement, useContext, useState, type ReactNode } from 'react';
import { useIsomorphicLayoutEffect } from '../../../hooks/useIsomorphicLayoutEffect';
import type { CrossScaleArrivalDescriptor } from './crossScaleArrivalState';
import type { CrossScalePlanePreviewState } from './crossScaleVisualState';

export interface CrossScaleViewOffsetState {
  curX: number;
  curY: number;
  initialized: boolean;
}

/**
 * Per-canvas mutable choreography state container safe to read and mutate inside `useFrame`
 * with zero heap allocations and zero React re-renders.
 */
export class CrossScaleChoreographyController {
  public sceneScale = 1.0;
  public instrumentFade = 1.0;
  public pendingArrival: CrossScaleArrivalDescriptor | null = null;
  public readonly planePreview: CrossScalePlanePreviewState = {
    active: false,
    mode: 'idle',
    position: [0, 0, 0],
    inclinationRad: 0,
    ascendingNodeRad: 0,
    maxRadius: 1,
    radiusProgress: 0,
    opacity: 0,
    durationSec: 0,
    elapsedSec: 0,
    onPhaseComplete: undefined,
  };
  public readonly viewOffset: CrossScaleViewOffsetState = {
    curX: 0,
    curY: 0,
    initialized: false,
  };

  public setViewOffset(curX: number, curY: number): void {
    this.viewOffset.curX = curX;
    this.viewOffset.curY = curY;
    this.viewOffset.initialized = true;
  }

  public reset(): void {
    this.sceneScale = 1.0;
    this.instrumentFade = 1.0;
    this.pendingArrival = null;
    this.planePreview.active = false;
    this.planePreview.mode = 'idle';
    this.planePreview.position[0] = 0;
    this.planePreview.position[1] = 0;
    this.planePreview.position[2] = 0;
    this.planePreview.inclinationRad = 0;
    this.planePreview.ascendingNodeRad = 0;
    this.planePreview.maxRadius = 1;
    this.planePreview.radiusProgress = 0;
    this.planePreview.opacity = 0;
    this.planePreview.durationSec = 0;
    this.planePreview.elapsedSec = 0;
    this.planePreview.onPhaseComplete = undefined;
    this.viewOffset.curX = 0;
    this.viewOffset.curY = 0;
    this.viewOffset.initialized = false;
  }
}

const defaultChoreographyController = new CrossScaleChoreographyController();
let activeChoreographyController: CrossScaleChoreographyController = defaultChoreographyController;

const CrossScaleChoreographyContext = createContext<CrossScaleChoreographyController | null>(null);

/**
 * Returns the currently active `CrossScaleChoreographyController` for module-level helpers.
 */
export function getActiveChoreographyController(): CrossScaleChoreographyController {
  return activeChoreographyController;
}

/**
 * Resets the fallback default choreography controller and restores it as active.
 */
export function resetDefaultChoreographyController(): void {
  defaultChoreographyController.reset();
  activeChoreographyController = defaultChoreographyController;
}

export interface CrossScaleChoreographyProviderProps {
  readonly children: ReactNode;
}

function createScopedChoreographyController(): CrossScaleChoreographyController {
  const controller = new CrossScaleChoreographyController();
  activeChoreographyController = controller;
  return controller;
}

/**
 * Scopes an isolated `CrossScaleChoreographyController` to a single React canvas subtree
 * and binds it as the active controller for module-level choreography helpers.
 */
export function CrossScaleChoreographyProvider({
  children,
}: CrossScaleChoreographyProviderProps) {
  const [controller] = useState(createScopedChoreographyController);

  useIsomorphicLayoutEffect(() => {
    activeChoreographyController = controller;
    return () => {
      if (activeChoreographyController === controller) {
        activeChoreographyController = defaultChoreographyController;
      }
      controller.reset();
    };
  }, [controller]);

  return createElement(
    CrossScaleChoreographyContext.Provider,
    { value: controller },
    children,
  );
}

/**
 * Returns the enclosing canvas `CrossScaleChoreographyController` or the shared fallback controller.
 */
export function useCrossScaleChoreography(): CrossScaleChoreographyController {
  return useContext(CrossScaleChoreographyContext) ?? defaultChoreographyController;
}
