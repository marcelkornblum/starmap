import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ALL_CANVAS_CLAMP_EDGES, useCameraStore } from '../../../stores/useCameraStore';
import { CLAMP_GLOW_CLEANUP_MS, CanvasClampGlow } from './CanvasClampGlow';

describe('CanvasClampGlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCameraStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders no active edge pulses initially', () => {
    render(<CanvasClampGlow />);

    expect(screen.getByTestId('canvas-clamp-glow')).toBeInTheDocument();
    for (const edge of ALL_CANVAS_CLAMP_EDGES) {
      expect(screen.queryByTestId(`canvas-clamp-glow-${edge}`)).toBeNull();
    }
  });

  it('pulses all four inner edges on a zoom-out ceiling bump and clears them after pulse duration', () => {
    render(<CanvasClampGlow />);

    act(() => {
      useCameraStore.getState().triggerClampBump(ALL_CANVAS_CLAMP_EDGES, 'zoom-out');
    });

    for (const edge of ALL_CANVAS_CLAMP_EDGES) {
      const el = screen.getByTestId(`canvas-clamp-glow-${edge}`);
      expect(el).toHaveAttribute('data-edge', edge);
      expect(el).toHaveAttribute('data-pulse-seq', '1');
    }

    act(() => {
      vi.advanceTimersByTime(CLAMP_GLOW_CLEANUP_MS);
    });

    for (const edge of ALL_CANVAS_CLAMP_EDGES) {
      expect(screen.queryByTestId(`canvas-clamp-glow-${edge}`)).toBeNull();
    }
  });

  it('pulses only the clamped directional edge on a pan clamp bump and restarts seq on repeated pushes', () => {
    render(<CanvasClampGlow />);

    act(() => {
      useCameraStore.getState().triggerClampBump(['right'], 'pan');
    });

    expect(screen.getByTestId('canvas-clamp-glow-right')).toHaveAttribute('data-pulse-seq', '1');
    expect(screen.queryByTestId('canvas-clamp-glow-left')).toBeNull();
    expect(screen.queryByTestId('canvas-clamp-glow-top')).toBeNull();
    expect(screen.queryByTestId('canvas-clamp-glow-bottom')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(CLAMP_GLOW_CLEANUP_MS / 2);
      useCameraStore.getState().triggerClampBump(['right'], 'pan');
    });

    expect(screen.getByTestId('canvas-clamp-glow-right')).toHaveAttribute('data-pulse-seq', '2');

    // Original timer should have been cancelled so seq 2 remains active past the first expiry
    act(() => {
      vi.advanceTimersByTime(CLAMP_GLOW_CLEANUP_MS / 2 + 10);
    });
    expect(screen.getByTestId('canvas-clamp-glow-right')).toHaveAttribute('data-pulse-seq', '2');

    // Clears after seq 2's full duration
    act(() => {
      vi.advanceTimersByTime(CLAMP_GLOW_CLEANUP_MS / 2);
    });
    expect(screen.queryByTestId('canvas-clamp-glow-right')).toBeNull();
  });
});
