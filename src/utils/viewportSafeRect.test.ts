import { describe, it, expect } from 'vitest';
import {
  MIN_SAFE_VIEWPORT_DIMENSION_PX,
  MAX_OPTICAL_OFFSET_FRACTION,
  computeViewportSafeRect,
  computeOpticalCenterOffsetPx,
  areViewportSafeRectsEqual,
  type PanelRectLike,
  type ViewportSafeRect,
} from './viewportSafeRect';

function rect(left: number, top: number, width: number, height: number): PanelRectLike {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

describe('viewportSafeRect', () => {
  it('exports expected threshold constants', () => {
    expect(MIN_SAFE_VIEWPORT_DIMENSION_PX).toBe(140);
    expect(MAX_OPTICAL_OFFSET_FRACTION).toBe(0.25);
  });

  describe('computeViewportSafeRect', () => {
    it('returns full viewport with zero insets when no panels are active', () => {
      const result = computeViewportSafeRect(1440, 900, {});

      expect(result).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 1440,
        height: 900,
        bypass: false,
      });
    });

    it('ignores zero-size panel rects', () => {
      const result = computeViewportSafeRect(1440, 900, {
        topBar: rect(0, 0, 1440, 0),
        floatingLeftItems: [rect(8, 80, 0, 400), rect(8, 80, 377, 0)],
        bodiesRegion: rect(1063, 0, 0, 900),
        controlsRegion: rect(0, 840, 1440, 0),
      });

      expect(result).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 1440,
        height: 900,
        bypass: false,
      });
    });

    it('computes left inset from floatingLeftItems on the left side and ignores full-width mobile sheets', () => {
      const result = computeViewportSafeRect(1440, 900, {
        floatingLeftItems: [
          rect(8, 120, 377, 260),
          rect(8, 400, 390, 220),
          // Full-width (> 65%) item must be ignored as left occlusion
          rect(0, 500, 1100, 200),
          // Right-half item (left >= 50%) must be ignored as left occlusion
          rect(800, 120, 300, 200),
        ],
      });

      expect(result.left).toBe(398);
      expect(result.width).toBe(1440 - 398);
      expect(result.bypass).toBe(false);
    });

    it('computes right inset from bodiesRegion when visible on the right half', () => {
      const desktop = computeViewportSafeRect(1440, 900, {
        bodiesRegion: rect(1008, 0, 432, 900),
      });
      expect(desktop.right).toBe(432);
      expect(desktop.width).toBe(1008);

      // Mobile drawer occupying >60% (left < 0.4 * vw) should not count as right dock inset
      const narrowMobileDrawer = computeViewportSafeRect(390, 844, {
        bodiesRegion: rect(47, 0, 343, 844),
      });
      expect(narrowMobileDrawer.right).toBe(0);
    });

    it('ignores desktop corner topBar but uses wide mobile topBar for top inset', () => {
      // Desktop: topBar inside leftColumn (width 377 < 0.5 * 1440)
      const desktop = computeViewportSafeRect(1440, 900, {
        topBar: rect(8, 8, 377, 96),
        floatingLeftItems: [rect(8, 112, 377, 400)],
      });
      expect(desktop.top).toBe(0);
      expect(desktop.left).toBe(385);

      // Edge case: topBar wider than 50% but still covered by leftInset + 24px margin
      const coveredTopBar = computeViewportSafeRect(700, 900, {
        topBar: rect(8, 8, 377, 80),
        floatingLeftItems: [rect(8, 100, 377, 300)],
      });
      expect(coveredTopBar.top).toBe(0);

      // Mobile: full-width topBar across top of viewport
      const mobile = computeViewportSafeRect(390, 844, {
        topBar: rect(5, 5, 380, 90),
      });
      expect(mobile.top).toBe(95);
      expect(mobile.height).toBe(844 - 95);
    });

    it('computes bottom inset from wide controlsRegion and non-full mobileDetentSheet', () => {
      const desktop = computeViewportSafeRect(1440, 900, {
        controlsRegion: rect(0, 844, 1440, 56),
      });
      expect(desktop.bottom).toBe(56);
      expect(desktop.height).toBe(844);

      // Narrow floating pill on mobile (< 50% width) does not push full bottom edge
      const mobilePillOnly = computeViewportSafeRect(390, 844, {
        controlsRegion: rect(240, 780, 145, 59),
      });
      expect(mobilePillOnly.bottom).toBe(0);

      // Centred desktop floating capsule (< 50% width on wide viewports, straddling horizontal centre)
      const desktopCapsule1440 = computeViewportSafeRect(1440, 900, {
        controlsRegion: rect(420, 840, 600, 48),
      });
      expect(desktopCapsule1440.bottom).toBe(60);
      expect(desktopCapsule1440.height).toBe(840);

      const desktopCapsule2560 = computeViewportSafeRect(2560, 1440, {
        controlsRegion: rect(980, 1380, 600, 48),
      });
      expect(desktopCapsule2560.bottom).toBe(60);
      expect(desktopCapsule2560.height).toBe(1380);

      // Mobile detent sheet in partial detent takes max over controls pill
      const mobileSheet = computeViewportSafeRect(390, 844, {
        controlsRegion: rect(0, 790, 390, 54),
        mobileDetentSheet: { ...rect(0, 544, 390, 300), detent: 'partial' },
      });
      expect(mobileSheet.bottom).toBe(300);
      expect(mobileSheet.height).toBe(544);
      expect(mobileSheet.bypass).toBe(false);
    });

    it('combines all active desktop regions cleanly', () => {
      const result = computeViewportSafeRect(1440, 900, {
        topBar: rect(8, 8, 377, 96),
        floatingLeftItems: [rect(8, 112, 377, 420)],
        bodiesRegion: rect(1008, 0, 432, 900),
        controlsRegion: rect(0, 844, 1440, 56),
      });

      expect(result).toEqual({
        top: 0,
        right: 432,
        bottom: 56,
        left: 385,
        width: 1440 - 385 - 432,
        height: 900 - 56,
        bypass: false,
      });
    });

    it('sets bypass when mobileDetentSheet is in full detent', () => {
      const result = computeViewportSafeRect(390, 844, {
        topBar: rect(5, 5, 380, 90),
        mobileDetentSheet: { ...rect(0, 60, 390, 784), detent: 'full' },
      });

      expect(result.bypass).toBe(true);
    });

    it('sets bypass when visible safe dimension falls below MIN_SAFE_VIEWPORT_DIMENSION_PX or viewport is non-positive', () => {
      const narrowSafe = computeViewportSafeRect(400, 600, {
        floatingLeftItems: [rect(0, 50, 200, 300)],
        bodiesRegion: rect(270, 0, 130, 600),
      });
      expect(narrowSafe.width).toBe(70);
      expect(narrowSafe.bypass).toBe(true);

      const shortSafe = computeViewportSafeRect(390, 300, {
        topBar: rect(5, 5, 380, 90),
        mobileDetentSheet: { ...rect(0, 210, 390, 90), detent: 'peek' },
      });
      expect(shortSafe.height).toBe(115);
      expect(shortSafe.bypass).toBe(true);

      const zeroViewport = computeViewportSafeRect(0, 0, {});
      expect(zeroViewport.bypass).toBe(true);
      expect(zeroViewport.width).toBe(0);
      expect(zeroViewport.height).toBe(0);
    });
  });

  describe('computeOpticalCenterOffsetPx', () => {
    it('returns zero offset when safeRect is null or bypass is true', () => {
      expect(computeOpticalCenterOffsetPx(null)).toEqual({ offsetX: 0, offsetY: 0 });
      expect(
        computeOpticalCenterOffsetPx({
          top: 90,
          right: 0,
          bottom: 700,
          left: 0,
          width: 390,
          height: 54,
          bypass: true,
        }),
      ).toEqual({ offsetX: 0, offsetY: 0 });
    });

    it('computes half-difference optical center offset within clamp bounds', () => {
      const safeRect: ViewportSafeRect = {
        top: 0,
        right: 300,
        bottom: 60,
        left: 380,
        width: 760,
        height: 840,
        bypass: false,
      };

      // rawX = (300 - 380) / 2 = -40, clamp [-190, +190]
      // rawY = (60 - 0) / 2 = 30, clamp [-210, +210]
      expect(computeOpticalCenterOffsetPx(safeRect)).toEqual({
        offsetX: -40,
        offsetY: 30,
      });
    });

    it('clamps extreme offsets to MAX_OPTICAL_OFFSET_FRACTION of full viewport dimensions', () => {
      const safeRect: ViewportSafeRect = {
        top: 0,
        right: 0,
        bottom: 500,
        left: 600,
        width: 400,
        height: 300,
        bypass: false,
      };

      // fullWidth = 1000 -> clamp [-250, +250]; rawX = -300 -> -250
      // fullHeight = 800 -> clamp [-200, +200]; rawY = +250 -> +200
      expect(computeOpticalCenterOffsetPx(safeRect)).toEqual({
        offsetX: -250,
        offsetY: 200,
      });
    });

    it('returns positive zero rather than -0 when balanced', () => {
      const safeRect: ViewportSafeRect = {
        top: 50,
        right: 200,
        bottom: 50,
        left: 200,
        width: 800,
        height: 700,
        bypass: false,
      };

      const offset = computeOpticalCenterOffsetPx(safeRect);
      expect(Object.is(offset.offsetX, 0)).toBe(true);
      expect(Object.is(offset.offsetY, 0)).toBe(true);
    });
  });

  describe('areViewportSafeRectsEqual', () => {
    const base: ViewportSafeRect = {
      top: 10,
      right: 300,
      bottom: 56,
      left: 385,
      width: 755,
      height: 834,
      bypass: false,
    };

    it('handles null comparisons and identical references', () => {
      expect(areViewportSafeRectsEqual(null, null)).toBe(true);
      expect(areViewportSafeRectsEqual(base, base)).toBe(true);
      expect(areViewportSafeRectsEqual(base, null)).toBe(false);
      expect(areViewportSafeRectsEqual(null, base)).toBe(false);
    });

    it('returns false when bypass flag differs', () => {
      expect(areViewportSafeRectsEqual(base, { ...base, bypass: true })).toBe(false);
    });

    it('treats differences within epsilonPx as equal and beyond epsilonPx as unequal', () => {
      expect(areViewportSafeRectsEqual(base, { ...base, left: 385.8 })).toBe(true);
      expect(areViewportSafeRectsEqual(base, { ...base, left: 386.5 })).toBe(false);
      expect(areViewportSafeRectsEqual(base, { ...base, width: 757 }, 2)).toBe(true);
      expect(areViewportSafeRectsEqual(base, { ...base, width: 758 }, 2)).toBe(false);
    });
  });
});
