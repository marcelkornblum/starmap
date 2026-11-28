import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PEEK_HEIGHT_PX,
  MAX_PARTIAL_SHEET_RATIO,
  FALLBACK_PARTIAL_SHEET_RATIO,
  SNAP_PROXIMITY_BAND_RATIO,
  computePartialSheetHeightPx,
  computeDetentExpandProgress,
  resolveDetentFromHeight,
  computeSheetDragStep,
  computeSheetReleaseSnap,
} from './detentSheetMath';

describe('detentSheetMath', () => {
  it('exports expected detent constants', () => {
    expect(DEFAULT_PEEK_HEIGHT_PX).toBe(116);
    expect(MAX_PARTIAL_SHEET_RATIO).toBe(0.68);
    expect(FALLBACK_PARTIAL_SHEET_RATIO).toBe(0.45);
    expect(SNAP_PROXIMITY_BAND_RATIO).toBe(0.08);
  });

  describe('computePartialSheetHeightPx', () => {
    it('returns peekHeightPx + midStageNaturalPx clamped to maxPartialRatio when midStageNaturalPx > 0', () => {
      // 116 + 180 = 296 (< 0.68 * 800 = 544)
      expect(
        computePartialSheetHeightPx({
          peekHeightPx: 116,
          midStageNaturalPx: 180,
          viewportHeightPx: 800,
        }),
      ).toBe(296);

      // 116 + 520 = 636 => clamped to Math.round(800 * 0.68) = 544
      expect(
        computePartialSheetHeightPx({
          peekHeightPx: 116,
          midStageNaturalPx: 520,
          viewportHeightPx: 800,
        }),
      ).toBe(544);

      // Custom maxPartialRatio override
      expect(
        computePartialSheetHeightPx({
          peekHeightPx: 120,
          midStageNaturalPx: 400,
          viewportHeightPx: 1000,
          maxPartialRatio: 0.5,
        }),
      ).toBe(500);
    });

    it('falls back to fallbackPartialRatio when midStageNaturalPx is undefined or 0', () => {
      expect(
        computePartialSheetHeightPx({
          peekHeightPx: 116,
          viewportHeightPx: 1000,
        }),
      ).toBe(450);

      expect(
        computePartialSheetHeightPx({
          peekHeightPx: 116,
          midStageNaturalPx: 0,
          viewportHeightPx: 1000,
        }),
      ).toBe(450);

      // Clamped at least to peekHeightPx on short viewports
      expect(
        computePartialSheetHeightPx({
          peekHeightPx: 116,
          midStageNaturalPx: 0,
          viewportHeightPx: 200,
        }),
      ).toBe(116);
    });
  });

  describe('computeDetentExpandProgress', () => {
    it('clamps to 0 at or below peek, 1 at or above partial, and interpolates linearly in between', () => {
      expect(computeDetentExpandProgress(100, 116, 316)).toBe(0);
      expect(computeDetentExpandProgress(116, 116, 316)).toBe(0);
      expect(computeDetentExpandProgress(216, 116, 316)).toBeCloseTo(0.5, 5);
      expect(computeDetentExpandProgress(166, 116, 316)).toBeCloseTo(0.25, 5);
      expect(computeDetentExpandProgress(316, 116, 316)).toBe(1);
      expect(computeDetentExpandProgress(500, 116, 316)).toBe(1);
    });

    it('returns 1 when partialHeightPx <= peekHeightPx and currentHeightPx > peekHeightPx', () => {
      expect(computeDetentExpandProgress(120, 116, 116)).toBe(1);
      expect(computeDetentExpandProgress(116, 116, 100)).toBe(0);
    });
  });

  describe('resolveDetentFromHeight', () => {
    it('uses explicit peekHeightPx and partialHeightPx when supplied', () => {
      // peek=120, partial=320 => midpoint=220; vh=1000 => full band=920
      expect(resolveDetentFromHeight(210, 1000, 120, 320)).toBe('peek');
      expect(resolveDetentFromHeight(225, 1000, 120, 320)).toBe('partial');
      expect(resolveDetentFromHeight(920, 1000, 120, 320)).toBe('full');
    });

    it('falls back to computePartialSheetHeightPx when partialHeightPx is omitted and handles non-positive viewport', () => {
      // peek=116, partial fallback=450 => midpoint=283
      expect(resolveDetentFromHeight(250, 1000)).toBe('peek');
      expect(resolveDetentFromHeight(300, 1000)).toBe('partial');
      expect(resolveDetentFromHeight(950, 1000)).toBe('full');
      expect(resolveDetentFromHeight(50, 0)).toBe('full');
      expect(resolveDetentFromHeight(50, -100)).toBe('full');
    });

    it('resolves to peek on short viewports when partialHeightPx <= peekHeightPx unless within full proximity band', () => {
      // Short viewport: vh=200, peek=116, partial=116 => full band >= 184
      expect(resolveDetentFromHeight(116, 200, 116, 116)).toBe('peek');
      expect(resolveDetentFromHeight(150, 200, 116, 116)).toBe('peek');
      expect(resolveDetentFromHeight(190, 200, 116, 116)).toBe('full');
    });
  });

  describe('computeSheetDragStep', () => {
    it('clamps between peekHeightPx and viewportHeightPx and resolves detent using explicit partialHeightPx', () => {
      const step = computeSheetDragStep({
        startHeightPx: 120,
        startClientY: 500,
        currentClientY: 400, // => 220px
        viewportHeightPx: 1000,
        peekHeightPx: 120,
        partialHeightPx: 300, // midpoint = 210 => 220 is partial
        isFullScreen: false,
        scrollTop: 0,
      });

      expect(step.nextHeightPx).toBe(220);
      expect(step.isFullScreen).toBe(false);
      expect(step.shouldPreventScroll).toBe(true);
      expect(step.effectiveDetent).toBe('partial');

      const clampedStep = computeSheetDragStep({
        startHeightPx: 140,
        startClientY: 300,
        currentClientY: 700,
        viewportHeightPx: 1000,
        peekHeightPx: 116,
        isFullScreen: false,
        scrollTop: 0,
      });
      expect(clampedStep.nextHeightPx).toBe(DEFAULT_PEEK_HEIGHT_PX);
      expect(clampedStep.effectiveDetent).toBe('peek');

      const scrollingStep = computeSheetDragStep({
        startHeightPx: 1000,
        startClientY: 200,
        currentClientY: 350,
        viewportHeightPx: 1000,
        isFullScreen: true,
        scrollTop: 45,
      });
      expect(scrollingStep.nextHeightPx).toBe(1000);
      expect(scrollingStep.shouldPreventScroll).toBe(false);
    });

    it('detects full screen boundary', () => {
      const step = computeSheetDragStep({
        startHeightPx: 950,
        startClientY: 200,
        currentClientY: 100,
        viewportHeightPx: 1000,
        isFullScreen: false,
        scrollTop: 0,
      });

      expect(step.nextHeightPx).toBe(1000);
      expect(step.isFullScreen).toBe(true);
      expect(step.effectiveDetent).toBe('full');
    });
  });

  describe('computeSheetReleaseSnap', () => {
    it('snaps to peek, variable partial, free-rest, or full using explicit peekHeightPx and partialHeightPx', () => {
      // peek=120, partial=300 => midpoint=210, band=80
      expect(
        computeSheetReleaseSnap({
          heightPx: 200,
          viewportHeightPx: 1000,
          peekHeightPx: 120,
          partialHeightPx: 300,
        }),
      ).toEqual({ snappedHeightPx: 120, detent: 'peek', isFullScreen: false });

      expect(
        computeSheetReleaseSnap({
          heightPx: 240,
          viewportHeightPx: 1000,
          peekHeightPx: 120,
          partialHeightPx: 300,
        }),
      ).toEqual({ snappedHeightPx: 300, detent: 'partial', isFullScreen: false });

      expect(
        computeSheetReleaseSnap({
          heightPx: 350,
          viewportHeightPx: 1000,
          peekHeightPx: 120,
          partialHeightPx: 300,
        }),
      ).toEqual({ snappedHeightPx: 300, detent: 'partial', isFullScreen: false });

      expect(
        computeSheetReleaseSnap({
          heightPx: 625.4,
          viewportHeightPx: 1000,
          peekHeightPx: 120,
          partialHeightPx: 300,
        }),
      ).toEqual({ snappedHeightPx: 625, detent: 'partial', isFullScreen: false });

      expect(
        computeSheetReleaseSnap({
          heightPx: 950,
          viewportHeightPx: 1000,
          peekHeightPx: 120,
          partialHeightPx: 300,
        }),
      ).toEqual({ snappedHeightPx: 1000, detent: 'full', isFullScreen: true });

      expect(
        computeSheetReleaseSnap({
          heightPx: 200,
          viewportHeightPx: 0,
          peekHeightPx: 120,
        }),
      ).toEqual({ snappedHeightPx: 120, detent: 'full', isFullScreen: true });
    });

    it('snaps to peek on short viewports when partialHeightPx <= peekHeightPx at peek height', () => {
      expect(
        computeSheetReleaseSnap({
          heightPx: 116,
          viewportHeightPx: 200,
          peekHeightPx: 116,
          partialHeightPx: 116,
        }),
      ).toEqual({ snappedHeightPx: 116, detent: 'peek', isFullScreen: false });

      expect(
        computeSheetReleaseSnap({
          heightPx: 195,
          viewportHeightPx: 200,
          peekHeightPx: 116,
          partialHeightPx: 116,
        }),
      ).toEqual({ snappedHeightPx: 200, detent: 'full', isFullScreen: true });
    });
  });
});
