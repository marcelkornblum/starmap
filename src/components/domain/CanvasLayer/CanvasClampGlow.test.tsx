import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ALL_CANVAS_CLAMP_EDGES, useCameraStore } from '../../../stores/useCameraStore';
import { CanvasClampGlow } from './CanvasClampGlow';

describe('CanvasClampGlow', () => {
  let rafQueue: FrameRequestCallback[] = [];
  let nowMs = 1000;

  beforeEach(() => {
    rafQueue = [];
    nowMs = 1000;
    useCameraStore.getState().reset();
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const stepFrames = (count: number, stepMs = 16) => {
    for (let i = 0; i < count; i++) {
      nowMs += stepMs;
      const batch = rafQueue;
      rafQueue = [];
      for (const cb of batch) cb(nowMs);
    }
  };

  it('renders all four edge elements inactive initially', () => {
    render(<CanvasClampGlow />);

    expect(screen.getByTestId('canvas-clamp-glow')).toBeInTheDocument();
    for (const edge of ALL_CANVAS_CLAMP_EDGES) {
      expect(screen.getByTestId(`canvas-clamp-glow-${edge}`)).toHaveAttribute('data-active', 'false');
    }
  });

  it('slowly rubber-bands larger under continuous zoom-out pressure and relaxes back to inactive on release', () => {
    render(<CanvasClampGlow />);

    act(() => {
      useCameraStore.getState().triggerClampBump(ALL_CANVAS_CLAMP_EDGES, 'zoom-out', 0.4);
      stepFrames(2);
    });

    const topEl = screen.getByTestId('canvas-clamp-glow-top');
    expect(topEl).toHaveAttribute('data-active', 'true');
    const initialOpacity = Number(topEl.style.opacity);
    expect(initialOpacity).toBeGreaterThan(0);

    // Continued pushing rubber-bands smoothly bigger without resetting
    act(() => {
      for (let i = 0; i < 6; i++) {
        useCameraStore.getState().triggerClampBump(ALL_CANVAS_CLAMP_EDGES, 'zoom-out', 0.4);
        stepFrames(1);
      }
    });

    const stretchedOpacity = Number(topEl.style.opacity);
    expect(stretchedOpacity).toBeGreaterThan(initialOpacity);
    expect(topEl.style.transform).toMatch(/^scaleY\(/);

    // After input stops, smoothly relaxes back to inactive
    act(() => {
      stepFrames(80, 25);
    });

    for (const edge of ALL_CANVAS_CLAMP_EDGES) {
      expect(screen.getByTestId(`canvas-clamp-glow-${edge}`)).toHaveAttribute('data-active', 'false');
    }
  });

  it('stretches only the clamped directional edge on a pan clamp bump', () => {
    render(<CanvasClampGlow />);

    act(() => {
      useCameraStore.getState().triggerClampBump(['right'], 'pan', 0.8);
      stepFrames(2);
    });

    const rightEl = screen.getByTestId('canvas-clamp-glow-right');
    expect(rightEl).toHaveAttribute('data-active', 'true');
    expect(rightEl.style.transform).toMatch(/^scaleX\(/);
    expect(screen.getByTestId('canvas-clamp-glow-left')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('canvas-clamp-glow-top')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('canvas-clamp-glow-bottom')).toHaveAttribute('data-active', 'false');
  });
});
