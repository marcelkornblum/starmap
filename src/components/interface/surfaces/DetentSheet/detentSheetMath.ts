export type DetentLevel = 'peek' | 'partial' | 'full';

export const MIN_SHEET_HEIGHT_PX = 56;
export const DEFAULT_MOBILE_SHEET_RATIO = 0.45;
export const PARTIAL_SHEET_RATIO = 0.45;
export const SNAP_PROXIMITY_BAND_RATIO = 0.08;

export interface SheetDragStepInput {
  readonly startHeightPx: number;
  readonly startClientY: number;
  readonly currentClientY: number;
  readonly viewportHeightPx: number;
  readonly minHeightPx?: number;
  readonly isFullScreen: boolean;
  readonly scrollTop: number;
}

export interface SheetDragStepResult {
  readonly nextHeightPx: number;
  readonly isFullScreen: boolean;
  readonly shouldPreventScroll: boolean;
  readonly effectiveDetent: DetentLevel;
}

export interface SheetReleaseSnapInput {
  readonly heightPx: number;
  readonly viewportHeightPx: number;
  readonly minHeightPx?: number;
  readonly partialRatio?: number;
  readonly proximityBandRatio?: number;
}

export interface SheetReleaseSnapResult {
  readonly snappedHeightPx: number;
  readonly detent: DetentLevel;
  readonly isFullScreen: boolean;
}

/**
 * Resolves discrete detent level from current height and viewport height.
 * peek below midpoint between min and partial height; full within top proximity band.
 */
export function resolveDetentFromHeight(heightPx: number, viewportHeightPx: number): DetentLevel {
  if (viewportHeightPx <= 0) return 'full';
  const fullH = Math.max(MIN_SHEET_HEIGHT_PX, viewportHeightPx);
  const partialH = Math.round(fullH * PARTIAL_SHEET_RATIO);
  const bandPx = Math.round(fullH * SNAP_PROXIMITY_BAND_RATIO);
  const midpoint = (MIN_SHEET_HEIGHT_PX + partialH) / 2;

  if (heightPx < midpoint) {
    return 'peek';
  }
  if (heightPx >= fullH - bandPx) {
    return 'full';
  }
  return 'partial';
}

/**
 * Computes continuous drag state clamped between min and max sheet heights.
 */
export function computeSheetDragStep(input: SheetDragStepInput): SheetDragStepResult {
  const minH = input.minHeightPx ?? MIN_SHEET_HEIGHT_PX;
  const maxH = Math.max(minH, input.viewportHeightPx);
  const deltaY = input.currentClientY - input.startClientY;

  let nextHeightPx: number;
  let isFullScreen: boolean;
  let shouldPreventScroll: boolean;

  if (input.isFullScreen) {
    if (input.scrollTop > 0) {
      nextHeightPx = maxH;
      isFullScreen = true;
      shouldPreventScroll = false;
    } else if (deltaY > 0) {
      nextHeightPx = Math.max(minH, Math.min(maxH, maxH - deltaY));
      isFullScreen = nextHeightPx >= maxH - 4;
      shouldPreventScroll = true;
    } else {
      nextHeightPx = maxH;
      isFullScreen = true;
      shouldPreventScroll = false;
    }
  } else {
    shouldPreventScroll = true;
    nextHeightPx = Math.max(minH, Math.min(maxH, input.startHeightPx - deltaY));
    isFullScreen = nextHeightPx >= maxH - 4;
  }

  const effectiveDetent = resolveDetentFromHeight(nextHeightPx, maxH);

  return {
    nextHeightPx,
    isFullScreen,
    shouldPreventScroll,
    effectiveDetent,
  };
}

/**
 * Computes final snap position and detent when pointer/touch is released per DEC-R051.
 */
export function computeSheetReleaseSnap(input: SheetReleaseSnapInput): SheetReleaseSnapResult {
  const peekH = input.minHeightPx ?? MIN_SHEET_HEIGHT_PX;
  if (input.viewportHeightPx <= 0) {
    return { snappedHeightPx: peekH, detent: 'full', isFullScreen: true };
  }
  const fullH = Math.max(peekH, input.viewportHeightPx);
  const partialRatio = input.partialRatio ?? PARTIAL_SHEET_RATIO;
  const partialH = Math.round(fullH * partialRatio);
  const bandRatio = input.proximityBandRatio ?? SNAP_PROXIMITY_BAND_RATIO;
  const bandPx = Math.round(fullH * bandRatio);
  const heightPx = input.heightPx;

  // Below partialH: abutting snap bands at midpoint between peek and partial
  if (heightPx <= partialH) {
    const midpoint = (peekH + partialH) / 2;
    if (heightPx < midpoint) {
      return { snappedHeightPx: peekH, detent: 'peek', isFullScreen: false };
    }
    return { snappedHeightPx: partialH, detent: 'partial', isFullScreen: false };
  }

  // Above partialH: proximity bands near partial and full, free-rest zone in between
  if (heightPx <= partialH + bandPx) {
    return { snappedHeightPx: partialH, detent: 'partial', isFullScreen: false };
  }
  if (heightPx >= fullH - bandPx) {
    return { snappedHeightPx: fullH, detent: 'full', isFullScreen: true };
  }

  return {
    snappedHeightPx: Math.round(heightPx),
    detent: 'partial',
    isFullScreen: false,
  };
}
