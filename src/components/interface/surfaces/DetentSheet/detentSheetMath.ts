export type DetentLevel = 'peek' | 'partial' | 'full';

export const DEFAULT_PEEK_HEIGHT_PX = 116;
export const MAX_PARTIAL_SHEET_RATIO = 0.68;
export const FALLBACK_PARTIAL_SHEET_RATIO = 0.45;
export const SNAP_PROXIMITY_BAND_RATIO = 0.08;

export interface PartialSheetHeightInput {
  readonly peekHeightPx: number;
  readonly midStageNaturalPx?: number;
  readonly viewportHeightPx: number;
  readonly maxPartialRatio?: number;
  readonly fallbackPartialRatio?: number;
}

export interface SheetDragStepInput {
  readonly startHeightPx: number;
  readonly startClientY: number;
  readonly currentClientY: number;
  readonly viewportHeightPx: number;
  readonly peekHeightPx?: number;
  readonly partialHeightPx?: number;
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
  readonly peekHeightPx?: number;
  readonly partialHeightPx?: number;
  readonly fallbackPartialRatio?: number;
  readonly proximityBandRatio?: number;
}

export interface SheetReleaseSnapResult {
  readonly snappedHeightPx: number;
  readonly detent: DetentLevel;
  readonly isFullScreen: boolean;
}

export interface MeasuredSheetMetrics {
  readonly stageHeightPx: number;
  readonly peekHeightPx: number;
  readonly midStageNaturalPx: number;
}

/**
 * Computes the intrinsic partial sheet height from measured peek + mid-stage heights,
 * falling back to FALLBACK_PARTIAL_SHEET_RATIO when no mid-stage content is measured.
 */
export function computePartialSheetHeightPx(params: PartialSheetHeightInput): number {
  const {
    peekHeightPx,
    midStageNaturalPx,
    viewportHeightPx,
    maxPartialRatio = MAX_PARTIAL_SHEET_RATIO,
    fallbackPartialRatio = FALLBACK_PARTIAL_SHEET_RATIO,
  } = params;

  if (midStageNaturalPx !== undefined && midStageNaturalPx > 0) {
    const maxPartialPx = Math.round(viewportHeightPx * maxPartialRatio);
    const upperBound = Math.max(peekHeightPx, maxPartialPx);
    return Math.min(upperBound, Math.max(peekHeightPx, Math.round(peekHeightPx + midStageNaturalPx)));
  }

  return Math.max(peekHeightPx, Math.round(viewportHeightPx * fallbackPartialRatio));
}

/**
 * Computes normalized 0..1 expansion progress between peek and partial heights.
 */
export function computeDetentExpandProgress(
  currentHeightPx: number,
  peekHeightPx: number,
  partialHeightPx: number,
): number {
  if (currentHeightPx <= peekHeightPx) return 0;
  if (partialHeightPx <= peekHeightPx || currentHeightPx >= partialHeightPx) return 1;
  return (currentHeightPx - peekHeightPx) / (partialHeightPx - peekHeightPx);
}

/**
 * Formats expansion progress as clean string for CSS custom properties.
 */
export function formatDetentExpandProgress(progress: number): string {
  if (progress <= 0) return '0';
  if (progress >= 1) return '1';
  return progress.toFixed(4);
}

/**
 * Resolves discrete detent level from current height and viewport height.
 * peek below midpoint between peek and partial height; full within top proximity band.
 */
export function resolveDetentFromHeight(
  heightPx: number,
  viewportHeightPx: number,
  peekHeightPx: number = DEFAULT_PEEK_HEIGHT_PX,
  partialHeightPx?: number,
): DetentLevel {
  if (viewportHeightPx <= 0) return 'full';
  const fullH = Math.max(peekHeightPx, viewportHeightPx);
  const partialH =
    partialHeightPx ??
    computePartialSheetHeightPx({ peekHeightPx, viewportHeightPx: fullH });
  const bandPx = Math.round(fullH * SNAP_PROXIMITY_BAND_RATIO);
  const midpoint = (peekHeightPx + partialH) / 2;

  if (heightPx < midpoint || (partialH <= peekHeightPx && heightPx <= peekHeightPx)) {
    return 'peek';
  }
  if (heightPx >= fullH - bandPx) {
    return 'full';
  }
  if (partialH <= peekHeightPx) {
    return 'peek';
  }
  return 'partial';
}

/**
 * Resolves the next discrete detent for keyboard interactions on the drag handle.
 * Returns null when no transition should occur.
 */
export function resolveKeyboardDetentStep(
  current: DetentLevel,
  key: string,
): DetentLevel | null {
  if (key === 'Enter' || key === ' ') {
    return current === 'peek' ? 'partial' : 'peek';
  }
  if (key === 'ArrowUp') {
    if (current === 'peek') return 'partial';
    if (current === 'partial') return 'full';
    return null;
  }
  if (key === 'ArrowDown') {
    if (current === 'full') return 'partial';
    if (current === 'partial') return 'peek';
    return null;
  }
  return null;
}

/**
 * Computes continuous drag state clamped between peek and max sheet heights.
 */
export function computeSheetDragStep(input: SheetDragStepInput): SheetDragStepResult {
  const peekH = input.peekHeightPx ?? DEFAULT_PEEK_HEIGHT_PX;
  const maxH = Math.max(peekH, input.viewportHeightPx);
  const partialH =
    input.partialHeightPx ??
    computePartialSheetHeightPx({ peekHeightPx: peekH, viewportHeightPx: maxH });
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
      nextHeightPx = Math.max(peekH, Math.min(maxH, maxH - deltaY));
      isFullScreen = nextHeightPx >= maxH - 4;
      shouldPreventScroll = true;
    } else {
      nextHeightPx = maxH;
      isFullScreen = true;
      shouldPreventScroll = false;
    }
  } else {
    shouldPreventScroll = true;
    nextHeightPx = Math.max(peekH, Math.min(maxH, input.startHeightPx - deltaY));
    isFullScreen = nextHeightPx >= maxH - 4;
  }

  const effectiveDetent = resolveDetentFromHeight(nextHeightPx, maxH, peekH, partialH);

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
  const peekH = input.peekHeightPx ?? DEFAULT_PEEK_HEIGHT_PX;
  if (input.viewportHeightPx <= 0) {
    return { snappedHeightPx: peekH, detent: 'full', isFullScreen: true };
  }
  const fullH = Math.max(peekH, input.viewportHeightPx);
  const partialH =
    input.partialHeightPx ??
    computePartialSheetHeightPx({
      peekHeightPx: peekH,
      viewportHeightPx: fullH,
      fallbackPartialRatio: input.fallbackPartialRatio,
    });
  const bandRatio = input.proximityBandRatio ?? SNAP_PROXIMITY_BAND_RATIO;
  const bandPx = Math.round(fullH * bandRatio);
  const heightPx = input.heightPx;

  // Below partialH: abutting snap bands at midpoint between peek and partial
  if (heightPx <= partialH) {
    const midpoint = (peekH + partialH) / 2;
    if (partialH <= peekH || heightPx < midpoint) {
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

/**
 * Resolves the target block-size in px for a discrete detent level.
 */
export function resolveDetentTargetHeight(
  detent: DetentLevel,
  metrics: MeasuredSheetMetrics,
): number {
  if (detent === 'peek') return metrics.peekHeightPx;
  if (detent === 'full') return Math.max(metrics.peekHeightPx, metrics.stageHeightPx);
  return computePartialSheetHeightPx({
    peekHeightPx: metrics.peekHeightPx,
    midStageNaturalPx: metrics.midStageNaturalPx,
    viewportHeightPx: metrics.stageHeightPx,
  });
}
