import type React from 'react';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export interface SystemCameraControllerProps {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly up: readonly [number, number, number];
}

export const SystemCameraController: React.FC<SystemCameraControllerProps> = ({
  position,
  target,
  up,
}) => {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const rawControls = useThree((s) => s.controls);
  const controls =
    typeof rawControls === 'object' &&
    rawControls !== null &&
    'target' in rawControls
      ? (rawControls as {
          target: { set: (x: number, y: number, z: number) => void };
          update?: () => void;
        })
      : undefined;

  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.up.set(up[0], up[1], up[2]);
    if (controls) {
      controls.target.set(target[0], target[1], target[2]);
      controls.update?.();
    } else {
      camera.lookAt(target[0], target[1], target[2]);
    }
    invalidate?.();
  }, [camera, controls, invalidate, position, target, up]);

  return null;
};
