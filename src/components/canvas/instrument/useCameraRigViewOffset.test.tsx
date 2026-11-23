import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { render, renderHook, act } from '@testing-library/react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  CrossScaleChoreographyProvider,
  resetDefaultChoreographyController,
} from './CrossScaleChoreographyContext';
import { useCameraRigViewOffset } from './useCameraRigViewOffset';
import { FRAME_PRIORITY } from '../engineConfig';
import { useUIStore } from '../../../stores/useUIStore';
import * as reducedMotion from '../../../utils/reducedMotion';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('useCameraRigViewOffset', () => {
  let perspCam: THREE.PerspectiveCamera;
  let orthoCam: THREE.OrthographicCamera;
  let perspCamRef: { current: THREE.PerspectiveCamera | null };
  let orthoCamRef: { current: THREE.OrthographicCamera | null };
  let mockInvalidate: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(false);
    useUIStore.getState().resetUI();
    perspCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    orthoCam = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 1000);
    perspCamRef = { current: perspCam };
    orthoCamRef = { current: orthoCam };
    mockInvalidate = vi.fn<() => void>();
  });

  afterEach(() => {
    resetDefaultChoreographyController();
    vi.restoreAllMocks();
  });

  function getLatestFrameCallback(): (state: unknown, delta: number) => void {
    const calls = vi.mocked(useFrame).mock.calls;
    const rigCalls = calls.filter(([, priority]) => priority === FRAME_PRIORITY.cameraRig);
    expect(rigCalls.length).toBeGreaterThan(0);
    return rigCalls[rigCalls.length - 1][0] as unknown as (state: unknown, delta: number) => void;
  }

  it('interpolates view offset over 0.35s easeOutCubic on both cameras and invalidates while animating', () => {
    const perspSetSpy = vi.spyOn(perspCam, 'setViewOffset');
    const orthoSetSpy = vi.spyOn(orthoCam, 'setViewOffset');

    renderHook(() =>
      useCameraRigViewOffset({
        perspCamRef,
        orthoCamRef,
        sizeWidth: 1440,
        sizeHeight: 900,
        invalidate: mockInvalidate,
      }),
    );

    expect(perspSetSpy).not.toHaveBeenCalled();
    expect(orthoSetSpy).not.toHaveBeenCalled();

    act(() => {
      useUIStore.getState().setViewportSafeRect({
        top: 60,
        right: 0,
        bottom: 100,
        left: 300,
        width: 1140,
        height: 740,
        bypass: false,
      });
    });

    // Target offset: offsetX = (0 - 300) / 2 = -150, offsetY = (100 - 60) / 2 = 20
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    const frameCb = getLatestFrameCallback();

    // Mid-transition (0.175s / 0.35s = 0.5 -> easeOutCubic(0.5) = 0.875)
    frameCb({}, 0.175);
    expect(perspCam.view).toMatchObject({
      enabled: true,
      fullWidth: 1440,
      fullHeight: 900,
      width: 1440,
      height: 900,
    });
    expect(perspCam.view?.offsetX).toBeCloseTo(-150 * 0.875, 4);
    expect(perspCam.view?.offsetY).toBeCloseTo(20 * 0.875, 4);
    expect(orthoCam.view?.offsetX).toBeCloseTo(-150 * 0.875, 4);
    expect(orthoCam.view?.offsetY).toBeCloseTo(20 * 0.875, 4);
    expect(mockInvalidate).toHaveBeenCalledTimes(2);

    // Complete transition (another 0.175s -> total 0.35s)
    frameCb({}, 0.175);
    expect(perspSetSpy).toHaveBeenLastCalledWith(1440, 900, -150, 20, 1440, 900);
    expect(orthoSetSpy).toHaveBeenLastCalledWith(1440, 900, -150, 20, 1440, 900);

    // Settled: further frames must be no-ops and not invalidate
    const callCountAtSettle = mockInvalidate.mock.calls.length;
    frameCb({}, 0.016);
    expect(mockInvalidate).toHaveBeenCalledTimes(callCountAtSettle);
  });

  it('snaps immediately without animation when prefersReducedMotion is true', () => {
    vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(true);
    const perspSetSpy = vi.spyOn(perspCam, 'setViewOffset');
    const orthoSetSpy = vi.spyOn(orthoCam, 'setViewOffset');

    renderHook(() =>
      useCameraRigViewOffset({
        perspCamRef,
        orthoCamRef,
        sizeWidth: 1440,
        sizeHeight: 900,
        invalidate: mockInvalidate,
      }),
    );

    act(() => {
      useUIStore.getState().setViewportSafeRect({
        top: 0,
        right: 320,
        bottom: 0,
        left: 0,
        width: 1120,
        height: 900,
        bypass: false,
      });
    });

    expect(perspSetSpy).toHaveBeenCalledWith(1440, 900, 160, 0, 1440, 900);
    expect(orthoSetSpy).toHaveBeenCalledWith(1440, 900, 160, 0, 1440, 900);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    const frameCb = getLatestFrameCallback();
    frameCb({}, 0.016);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('clears view offset on both cameras when safe rect becomes null or bypass is true', () => {
    vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(true);
    const perspClearSpy = vi.spyOn(perspCam, 'clearViewOffset');
    const orthoClearSpy = vi.spyOn(orthoCam, 'clearViewOffset');

    renderHook(() =>
      useCameraRigViewOffset({
        perspCamRef,
        orthoCamRef,
        sizeWidth: 1440,
        sizeHeight: 900,
        invalidate: mockInvalidate,
      }),
    );

    act(() => {
      useUIStore.getState().setViewportSafeRect({
        top: 0,
        right: 0,
        bottom: 0,
        left: 280,
        width: 1160,
        height: 900,
        bypass: false,
      });
    });
    expect(perspCam.view?.enabled).toBe(true);
    expect(orthoCam.view?.enabled).toBe(true);

    act(() => {
      useUIStore.getState().setViewportSafeRect({
        top: 0,
        right: 0,
        bottom: 0,
        left: 280,
        width: 1160,
        height: 900,
        bypass: true,
      });
    });

    expect(perspClearSpy).toHaveBeenCalled();
    expect(orthoClearSpy).toHaveBeenCalled();
    expect(perspCam.view?.enabled).toBe(false);
    expect(orthoCam.view?.enabled).toBe(false);
  });

  it('re-applies current view offset to both cameras on viewport resize and preserves it on unmount', () => {
    vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(true);
    const perspSetSpy = vi.spyOn(perspCam, 'setViewOffset');
    const orthoSetSpy = vi.spyOn(orthoCam, 'setViewOffset');
    const perspClearSpy = vi.spyOn(perspCam, 'clearViewOffset');
    const orthoClearSpy = vi.spyOn(orthoCam, 'clearViewOffset');

    const { rerender, unmount } = renderHook(
      ({ w, h }: { w: number; h: number }) =>
        useCameraRigViewOffset({
          perspCamRef,
          orthoCamRef,
          sizeWidth: w,
          sizeHeight: h,
          invalidate: mockInvalidate,
        }),
      { initialProps: { w: 1440, h: 900 } },
    );

    act(() => {
      useUIStore.getState().setViewportSafeRect({
        top: 0,
        right: 0,
        bottom: 0,
        left: 240,
        width: 1200,
        height: 900,
        bypass: false,
      });
    });

    perspSetSpy.mockClear();
    orthoSetSpy.mockClear();

    rerender({ w: 1280, h: 720 });

    expect(perspSetSpy).toHaveBeenCalledWith(1280, 720, -120, 0, 1280, 720);
    expect(orthoSetSpy).toHaveBeenCalledWith(1280, 720, -120, 0, 1280, 720);

    perspClearSpy.mockClear();
    orthoClearSpy.mockClear();
    unmount();

    expect(perspClearSpy).not.toHaveBeenCalled();
    expect(orthoClearSpy).not.toHaveBeenCalled();
  });

  it('persists optical-centre offset across CameraRig scale swaps inside CrossScaleChoreographyProvider without re-easing from 0', () => {
    const sharedSafeRect = {
      top: 40,
      right: 0,
      bottom: 80,
      left: 240,
      width: 1200,
      height: 780,
      bypass: false,
    };
    useUIStore.getState().setViewportSafeRect(sharedSafeRect);

    const perspClearSpy = vi.spyOn(perspCam, 'clearViewOffset');
    const nextOrthoCam = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 1000);
    const nextOrthoSetSpy = vi.spyOn(nextOrthoCam, 'setViewOffset');

    const OutgoingRig = () => {
      useCameraRigViewOffset({
        perspCamRef,
        orthoCamRef,
        sizeWidth: 1440,
        sizeHeight: 900,
        invalidate: mockInvalidate,
      });
      return null;
    };

    const IncomingRig = () => {
      useCameraRigViewOffset({
        perspCamRef,
        orthoCamRef: { current: nextOrthoCam },
        sizeWidth: 1440,
        sizeHeight: 900,
        invalidate: mockInvalidate,
      });
      return null;
    };

    const TestShell = ({ incoming }: { incoming: boolean }) =>
      createElement(
        CrossScaleChoreographyProvider,
        null,
        incoming ? createElement(IncomingRig) : createElement(OutgoingRig),
      );

    const { rerender, unmount } = render(createElement(TestShell, { incoming: false }));

    const frameCb = getLatestFrameCallback();
    frameCb({}, 0.35);
    expect(perspCam.view?.offsetX).toBeCloseTo(-120, 4);
    expect(perspCam.view?.offsetY).toBeCloseTo(20, 4);

    act(() => {
      rerender(createElement(TestShell, { incoming: true }));
    });

    expect(perspClearSpy).not.toHaveBeenCalled();
    expect(perspCam.view?.offsetX).toBeCloseTo(-120, 4);
    expect(perspCam.view?.offsetY).toBeCloseTo(20, 4);
    expect(nextOrthoSetSpy).toHaveBeenCalledWith(1440, 900, -120, 20, 1440, 900);

    unmount();
  });
});
