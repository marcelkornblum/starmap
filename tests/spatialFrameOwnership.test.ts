import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  SpatialFrameProvider,
  useSpatialFrame,
  CameraRig,
  CartographicInstrument,
} from '../src/components/canvas/instrument';
import {
  FRAME_PRIORITY,
  ORBIT_CONTROLS_PRIORITY,
} from '../src/components/canvas/engineConfig';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Html: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
  };
});

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: () => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      gl: { setClearColor: vi.fn() },
      scene: new THREE.Scene(),
      size: { width: 1920, height: 1080 },
    }),
  };
});

type FrameRef = ReturnType<typeof useSpatialFrame>['frameRef'];
type FrameCallback = (state: unknown, delta: number) => void;

function createProbe(sink: FrameRef[]): React.FC {
  return function FrameProbe() {
    sink.push(useSpatialFrame().frameRef);
    return null;
  };
}

describe('Spatial frame ownership (one provider per viewport)', () => {
  beforeEach(() => {
    vi.mocked(useFrame).mockClear();
  });

  it('throws when a frame consumer is rendered outside a SpatialFrameProvider', () => {
    const Probe = createProbe([]);
    expect(() => renderToString(createElement(Probe))).toThrow(/SpatialFrameProvider/);
  });

  it('CartographicInstrument consumes the enclosing provider instead of creating its own', () => {
    const refs: FrameRef[] = [];
    const Probe = createProbe(refs);
    renderToString(
      createElement(
        SpatialFrameProvider,
        { frame: SYSTEM_FRAME },
        createElement(Probe),
        createElement(CartographicInstrument, null, createElement(Probe)),
      ),
    );
    expect(refs).toHaveLength(2);
    expect(refs[1]).toBe(refs[0]);
    expect(refs[1].current.frame).toBe(SYSTEM_FRAME);
  });

  it('runs after OrbitControls and never updates controls itself', () => {
    const refs: FrameRef[] = [];
    const Probe = createProbe(refs);
    renderToString(createElement(SpatialFrameProvider, { frame: GALACTIC_FRAME }, createElement(Probe)));

    const providerCall = vi.mocked(useFrame).mock.calls[0];
    const [callback, priority] = providerCall as unknown as [FrameCallback, number];
    expect(priority).toBe(FRAME_PRIORITY.spatialFrame);
    expect(priority).toBeGreaterThan(ORBIT_CONTROLS_PRIORITY);
    expect(priority).toBeLessThan(0);

    const update = vi.fn();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(1, -28, 20);
    callback({ camera, controls: { target: new THREE.Vector3(1, 2, 0), update } }, 0.016);

    expect(update).not.toHaveBeenCalled();
    expect(refs[0].current.focusPoint.toArray()).toEqual([1, 2, 0]);
  });

  it('orders camera writers, controls, frame maths and camera rig deterministically', () => {
    expect(FRAME_PRIORITY.cameraTransition).toBeLessThan(ORBIT_CONTROLS_PRIORITY);
    expect(ORBIT_CONTROLS_PRIORITY).toBeLessThan(FRAME_PRIORITY.spatialFrame);
    expect(FRAME_PRIORITY.spatialFrame).toBeLessThan(FRAME_PRIORITY.cameraRig);
    expect(FRAME_PRIORITY.cameraRig).toBeLessThan(0);

    renderToString(createElement(SpatialFrameProvider, { frame: GALACTIC_FRAME }, createElement(CameraRig)));
    const rigCall = vi.mocked(useFrame).mock.calls[1];
    expect(rigCall[1]).toBe(FRAME_PRIORITY.cameraRig);
  });
});
