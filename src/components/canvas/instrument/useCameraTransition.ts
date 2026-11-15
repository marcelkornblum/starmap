import { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useLazyRef } from '../../../hooks/useLazyRef';
import { useUIStore } from '../../../stores/useUIStore';
import { FRAME_PRIORITY } from '../engineConfig';
import { criticallyDamped, interpolateLogarithmicDistance } from '../math/cameraFrustumMath';
import { DEFAULT_TRANSITION_DURATION_SEC } from './instrumentDefaults';

export type CameraTransitionEasing = 'easeInOutCubic' | 'criticallyDamped' | ((t: number) => number);

export interface CameraTransitionOptions {
  duration?: number;
  targetDistance?: number;
  easing?: CameraTransitionEasing;
  logarithmicDistance?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

export interface CameraTransitionApi {
  transitionTo: (target: THREE.Vector3 | [number, number, number], options?: CameraTransitionOptions) => void;
  cancelTransition: () => void;
  isTransitioning: () => boolean;
}

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
  private duration = DEFAULT_TRANSITION_DURATION_SEC;
  private options?: CameraTransitionOptions;

  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private startCamPos = new THREE.Vector3();
  private endCamPos = new THREE.Vector3();
  private startDist = 0;
  private endDist = 0;
  private useLogDist = false;

  private scratchOffset = new THREE.Vector3();
  private scratchDir = new THREE.Vector3();
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
    if (target instanceof THREE.Vector3) {
      this.endTarget.copy(target);
    } else {
      this.endTarget.set(target[0], target[1], target[2]);
    }

    if (controlsTarget) {
      this.startTarget.copy(controlsTarget);
    } else {
      camera.getWorldDirection(this.scratchDir);
      const camDist = Math.max(camera.position.length(), 1.0);
      this.startTarget.copy(camera.position).addScaledVector(this.scratchDir, camDist);
    }

    this.scratchOffset.copy(camera.position).sub(this.startTarget);
    const currentDist = this.scratchOffset.length();
    if (currentDist > 1e-4) {
      this.scratchDir.copy(this.scratchOffset).divideScalar(currentDist);
    } else {
      this.scratchDir.set(0, 0, 1);
    }

    const targetDist = options?.targetDistance ?? currentDist;
    this.startDist = currentDist;
    this.endDist = targetDist;
    this.useLogDist =
      (options?.logarithmicDistance ?? true) &&
      this.startDist > 1e-3 &&
      this.endDist > 1e-3 &&
      Math.abs(Math.log10(this.endDist / this.startDist)) > 0.05;

    if (options?.targetDistance !== undefined && currentDist > 1e-4) {
      this.scratchOffset.copy(this.scratchDir).multiplyScalar(targetDist);
    }

    this.startCamPos.copy(camera.position);
    this.endCamPos.copy(this.endTarget).add(this.scratchOffset);
    this.duration = options?.duration ?? DEFAULT_TRANSITION_DURATION_SEC;
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

    let t: number;
    const easing = this.options?.easing ?? 'easeInOutCubic';
    if (typeof easing === 'function') {
      t = easing(progress);
    } else if (easing === 'criticallyDamped') {
      t = criticallyDamped(progress);
    } else {
      t = easeInOutCubic(progress);
    }

    this.scratchCurrentTarget.lerpVectors(this.startTarget, this.endTarget, t);
    if (this.useLogDist) {
      const d = interpolateLogarithmicDistance(this.startDist, this.endDist, t);
      this.scratchCurrentCamPos.copy(this.scratchCurrentTarget).addScaledVector(this.scratchDir, d);
    } else {
      this.scratchCurrentCamPos.lerpVectors(this.startCamPos, this.endCamPos, t);
    }

    if (controls && controls.target instanceof THREE.Vector3) {
      controls.target.copy(this.scratchCurrentTarget);
      camera.position.copy(this.scratchCurrentCamPos);
      if (typeof controls.update === 'function') controls.update();
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
    useUIStore.getState().setCameraTransitioning(false);
  }, [controllerRef]);

  const transitionTo = useCallback(
    (target: THREE.Vector3 | [number, number, number], options?: CameraTransitionOptions) => {
      useUIStore.getState().setCameraTransitioning(true);
      const wrappedOptions: CameraTransitionOptions = {
        ...options,
        onComplete: () => {
          useUIStore.getState().setCameraTransitioning(false);
          options?.onComplete?.();
        },
        onCancel: () => {
          useUIStore.getState().setCameraTransitioning(false);
          options?.onCancel?.();
        },
      };

      controllerRef.current.start(camera, target, controls?.target, wrappedOptions);
      invalidate();
    },
    [camera, controls, invalidate, controllerRef],
  );

  useEffect(() => {
    if (!controls || typeof controls.addEventListener !== 'function') return;
    const handleUserInteract = () => { cancelTransition(); };
    controls.addEventListener('start', handleUserInteract);
    return () => {
      controls.removeEventListener?.('start', handleUserInteract);
    };
  }, [controls, cancelTransition]);

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      if (controller.isTransitioning()) {
        useUIStore.getState().setCameraTransitioning(false);
      }
    };
  }, [controllerRef]);

  useFrame(() => {
    const updated = controllerRef.current.update(camera, controls);
    if (updated) invalidate();
  }, FRAME_PRIORITY.cameraTransition);

  return { transitionTo, cancelTransition, isTransitioning: () => controllerRef.current.isTransitioning() };
}
