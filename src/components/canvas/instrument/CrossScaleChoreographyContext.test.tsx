import { describe, it, expect, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render, renderHook } from '@testing-library/react';
import {
  CrossScaleChoreographyController,
  CrossScaleChoreographyProvider,
  getActiveChoreographyController,
  resetDefaultChoreographyController,
  useCrossScaleChoreography,
} from './CrossScaleChoreographyContext';

describe('CrossScaleChoreographyContext', () => {
  beforeEach(() => {
    resetDefaultChoreographyController();
  });

  it('initialises default controller state and resets all fields in-place with zero allocations', () => {
    const controller = new CrossScaleChoreographyController();
    const previewRef = controller.planePreview;
    const positionRef = controller.planePreview.position;
    const viewOffsetRef = controller.viewOffset;

    expect(controller.sceneScale).toBe(1.0);
    expect(controller.instrumentFade).toBe(1.0);
    expect(controller.pendingArrival).toBeNull();
    expect(controller.planePreview.active).toBe(false);
    expect(controller.planePreview.mode).toBe('idle');
    expect(controller.viewOffset).toEqual({ curX: 0, curY: 0, initialized: false });

    controller.sceneScale = 0.25;
    controller.instrumentFade = 0.4;
    controller.pendingArrival = {
      direction: 'in',
      targetScope: 'system',
      durationSec: 1.0,
    };
    controller.planePreview.active = true;
    controller.planePreview.mode = 'holding';
    controller.planePreview.position[0] = 5;
    controller.planePreview.maxRadius = 12;
    controller.viewOffset.curX = -120;
    controller.viewOffset.curY = 24;
    controller.viewOffset.initialized = true;

    controller.reset();

    expect(controller.planePreview).toBe(previewRef);
    expect(controller.planePreview.position).toBe(positionRef);
    expect(controller.viewOffset).toBe(viewOffsetRef);
    expect(controller.sceneScale).toBe(1.0);
    expect(controller.instrumentFade).toBe(1.0);
    expect(controller.pendingArrival).toBeNull();
    expect(controller.planePreview.active).toBe(false);
    expect(controller.planePreview.mode).toBe('idle');
    expect(controller.planePreview.position).toEqual([0, 0, 0]);
    expect(controller.planePreview.maxRadius).toBe(1);
    expect(controller.viewOffset).toEqual({ curX: 0, curY: 0, initialized: false });
  });

  it('creates an isolated controller per CrossScaleChoreographyProvider and restores default on unmount', () => {
    const defaultCtrl = getActiveChoreographyController();

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(CrossScaleChoreographyProvider, null, children);

    const { result, unmount } = renderHook(() => useCrossScaleChoreography(), { wrapper });

    expect(result.current).not.toBe(defaultCtrl);
    expect(getActiveChoreographyController()).toBe(result.current);

    result.current.viewOffset.curX = -80;
    result.current.viewOffset.initialized = true;
    expect(defaultCtrl.viewOffset.initialized).toBe(false);

    unmount();

    expect(getActiveChoreographyController()).toBe(defaultCtrl);
  });

  it('provides distinct controllers to separate provider instances', () => {
    const seen: CrossScaleChoreographyController[] = [];
    const Probe = () => {
      seen.push(useCrossScaleChoreography());
      return null;
    };

    render(
      createElement(
        'div',
        null,
        createElement(CrossScaleChoreographyProvider, null, createElement(Probe)),
        createElement(CrossScaleChoreographyProvider, null, createElement(Probe)),
      ),
    );

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
  });
});
