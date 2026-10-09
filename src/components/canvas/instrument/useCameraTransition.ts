import { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { FRAME_PRIORITY } from '../../poc/canvas/engineConfig';

export interface CameraTransitionOptions {
  /** Transition duration in seconds. Default: 0.8 */
  duration?: number;
  /** Optional target camera distance from focal point. Preserves current distance if omitted */
  targetDistance?: number;
  /** Callback invoked when transition successfully completes */
  onComplete?: () => void;
  /** Callback invoked if transition is cancelled by user input */
  onCancel?: () => void;
}

export interface CameraTransitionApi {
  /** Smoothly transitions the camera and controls target to the specified world coordinates */
  transitionTo: (
    target: THREE.Vector3 | [number, number, number],
    options?: CameraTransitionOptions,
  ) => void;
  /** Immediately halts any running transition */
  cancelTransition: () => void;
  /** Returns whether a programmatic transition is currently active */
  isTransitioning: () => boolean;
}

/**
 * Standard cubic ease-in-out easing function.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Pure Three.js camera transition controller.
 * Operates zero-allocation frame updates for smooth camera & instrument centering.
 */
export class CameraTransitionController {
  private isTransitioningState = false;
  private startTime = 0;
  private duration = 0.8;
  private options?: CameraTransitionOptions;

  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private startCamPos = new THREE.Vector3();
  private endCamPos = new THREE.Vector3();

  private scratchOffset = new THREE.Vector3();
  private scratchCurrentTarget = new THREE.Vector3();
  private scratchCurrentCamPos = new THREE.Vector3();

  public isTransitioning(): boolean {
    return this.isTransitioningState;
  }

  public cancel(): void {
    if (this.isTransitioningState) {
      this.isTransitioningState = false;
      const onCancel = this.options?.onCancel;
      this.options = undefined;
      onCancel?.();
    }
  }

  public start(
    camera: THREE.Camera,
    target: THREE.Vector3 | [number, number, number],
    controlsTarget?: THREE.Vector3,
    options?: CameraTransitionOptions,
    now: number = performance.now(),
  ): void {
    // 1. Resolve target position
    if (target instanceof THREE.Vector3) {
      this.endTarget.copy(target);
    } else {
      this.endTarget.set(target[0], target[1], target[2]);
    }

    // 2. Resolve start target (from controls or default origin)
    if (controlsTarget instanceof THREE.Vector3) {
      this.startTarget.copy(controlsTarget);
    } else {
      this.startTarget.set(0, 0, 0);
    }

    // 3. Compute relative camera offset and target camera distance
    this.scratchOffset.copy(camera.position).sub(this.startTarget);
    const currentDist = this.scratchOffset.length();
    const targetDist = options?.targetDistance ?? currentDist;

    if (options?.targetDistance !== undefined && currentDist > 1e-4) {
      this.scratchOffset.normalize().multiplyScalar(targetDist);
    }

    // 4. Configure start and end camera positions
    this.startCamPos.copy(camera.position);
    this.endCamPos.copy(this.endTarget).add(this.scratchOffset);

    // 5. Initialize timing and state
    this.duration = options?.duration ?? 0.8;
    this.options = options;
    this.startTime = now;
    this.isTransitioningState = true;
  }

  public update(
    camera: THREE.Camera,
    controls?: { target?: THREE.Vector3; update?: () => void },
    now: number = performance.now(),
  ): boolean {
    if (!this.isTransitioningState) return false;

    const elapsed = (now - this.startTime) / 1000;
    const dur = Math.max(this.duration, 0.001);
    const progress = Math.min(elapsed / dur, 1.0);
    const t = easeInOutCubic(progress);

    this.scratchCurrentTarget.lerpVectors(this.startTarget, this.endTarget, t);
    this.scratchCurrentCamPos.lerpVectors(this.startCamPos, this.endCamPos, t);

    if (controls && controls.target instanceof THREE.Vector3) {
      controls.target.copy(this.scratchCurrentTarget);
      camera.position.copy(this.scratchCurrentCamPos);
      if (typeof controls.update === 'function') {
        controls.update();
      }
    } else {
      camera.position.copy(this.scratchCurrentCamPos);
      camera.lookAt(this.scratchCurrentTarget);
    }

    if (progress >= 1.0) {
      this.isTransitioningState = false;
      const onComplete = this.options?.onComplete;
      this.options = undefined;
      onComplete?.();
    }

    return true;
  }
}

/**
 * Hook providing smooth, zero-allocation camera and instrument focal transitions.
 * Coordinates controls.target and camera.position, maintaining viewing angle
 * while cleanly yielding if the user interacts during the transition.
 */
export function useCameraTransition(): CameraTransitionApi {
  const { camera, invalidate } = useThree();
  const controls = useThree(
    (s) =>
      (
        s as unknown as {
          controls?: {
            target?: THREE.Vector3;
            update?: () => void;
            addEventListener?: (type: string, listener: () => void) => void;
            removeEventListener?: (type: string, listener: () => void) => void;
          };
        }
      ).controls,
  );

  const controllerRef = useLazyRef(() => new CameraTransitionController());

  const cancelTransition = useCallback(() => {
    controllerRef.current.cancel();
  }, [controllerRef]);

  const transitionTo = useCallback(
    (
      target: THREE.Vector3 | [number, number, number],
      options?: CameraTransitionOptions,
    ) => {
      controllerRef.current.start(
        camera,
        target,
        controls?.target,
        options,
      );
      invalidate();
    },
    [camera, controls, invalidate, controllerRef],
  );

  // Yield cleanly to user interaction if OrbitControls is manipulated
  useEffect(() => {
    if (!controls || typeof controls.addEventListener !== 'function') return;

    const handleUserInteract = () => {
      cancelTransition();
    };

    controls.addEventListener('start', handleUserInteract);
    return () => {
      controls.removeEventListener?.('start', handleUserInteract);
    };
  }, [controls, cancelTransition]);

  // Frame animation loop: runs before OrbitControls and the spatial frame (see FRAME_PRIORITY)
  useFrame(() => {
    const updated = controllerRef.current.update(camera, controls);
    if (updated) {
      invalidate();
    }
  }, FRAME_PRIORITY.cameraTransition);

  const isTransitioning = useCallback(
    () => controllerRef.current.isTransitioning(),
    [controllerRef],
  );

  return {
    transitionTo,
    cancelTransition,
    isTransitioning,
  };
}
