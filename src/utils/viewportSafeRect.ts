export interface ViewportSafeRect {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly bypass: boolean;
}

export type PanelRectLike = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

export interface MeasuredHudPanels {
  readonly topBar?: PanelRectLike | null;
  readonly floatingLeftItems?: readonly PanelRectLike[];
  readonly bodiesRegion?: PanelRectLike | null;
  readonly controlsRegion?: PanelRectLike | null;
  readonly mobileDetentSheet?: (PanelRectLike & { readonly detent?: string | null }) | null;
}

export const MIN_SAFE_VIEWPORT_DIMENSION_PX = 140;
export const MAX_OPTICAL_OFFSET_FRACTION = 0.25;

const TOP_BAR_LEFT_OCCLUSION_MARGIN_PX = 24;

function isValidRect(rect: PanelRectLike | null | undefined): rect is PanelRectLike {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function clamp(value: number, min: number, max: number): number {
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/**
 * Computes the unobstructed 3D viewport safe rectangle from individual active HUD panels.
 */
export function computeViewportSafeRect(
  viewportWidth: number,
  viewportHeight: number,
  panels: MeasuredHudPanels,
): ViewportSafeRect {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      bypass: true,
    };
  }

  let left = 0;
  if (panels.floatingLeftItems) {
    for (const item of panels.floatingLeftItems) {
      if (!isValidRect(item)) continue;
      if (item.left < viewportWidth * 0.5 && item.width < viewportWidth * 0.65) {
        left = Math.max(left, clamp(item.right, 0, viewportWidth));
      }
    }
  }

  let right = 0;
  if (isValidRect(panels.bodiesRegion) && panels.bodiesRegion.left >= viewportWidth * 0.4) {
    right = clamp(viewportWidth - panels.bodiesRegion.left, 0, viewportWidth);
  }

  let top = 0;
  if (
    isValidRect(panels.topBar) &&
    panels.topBar.width > viewportWidth * 0.5 &&
    panels.topBar.right > left + TOP_BAR_LEFT_OCCLUSION_MARGIN_PX
  ) {
    top = clamp(panels.topBar.bottom, 0, viewportHeight);
  }

  let bottom = 0;
  if (isValidRect(panels.controlsRegion) && panels.controlsRegion.width >= viewportWidth * 0.5) {
    bottom = Math.max(bottom, clamp(viewportHeight - panels.controlsRegion.top, 0, viewportHeight));
  }
  if (
    isValidRect(panels.mobileDetentSheet) &&
    panels.mobileDetentSheet.detent !== 'full'
  ) {
    bottom = Math.max(
      bottom,
      clamp(viewportHeight - panels.mobileDetentSheet.top, 0, viewportHeight),
    );
  }

  const width = Math.max(0, viewportWidth - left - right);
  const height = Math.max(0, viewportHeight - top - bottom);
  const bypass =
    panels.mobileDetentSheet?.detent === 'full' ||
    width < MIN_SAFE_VIEWPORT_DIMENSION_PX ||
    height < MIN_SAFE_VIEWPORT_DIMENSION_PX;

  return {
    top,
    right,
    bottom,
    left,
    width,
    height,
    bypass,
  };
}

/**
 * Computes the clamped pixel offset from full-viewport centre to the safe-rect optical centre.
 */
export function computeOpticalCenterOffsetPx(
  safeRect: ViewportSafeRect | null,
): { readonly offsetX: number; readonly offsetY: number } {
  if (!safeRect || safeRect.bypass) {
    return { offsetX: 0, offsetY: 0 };
  }

  const fullWidth = safeRect.width + safeRect.left + safeRect.right;
  const fullHeight = safeRect.height + safeRect.top + safeRect.bottom;
  const maxOffsetX = Math.max(0, fullWidth * MAX_OPTICAL_OFFSET_FRACTION);
  const maxOffsetY = Math.max(0, fullHeight * MAX_OPTICAL_OFFSET_FRACTION);
  const rawX = (safeRect.right - safeRect.left) / 2;
  const rawY = (safeRect.bottom - safeRect.top) / 2;

  return {
    offsetX: normalizeZero(clamp(rawX, -maxOffsetX, maxOffsetX)),
    offsetY: normalizeZero(clamp(rawY, -maxOffsetY, maxOffsetY)),
  };
}

/**
 * Compares two safe-rect measurements within a sub-pixel epsilon threshold.
 */
export function areViewportSafeRectsEqual(
  a: ViewportSafeRect | null,
  b: ViewportSafeRect | null,
  epsilonPx = 1,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.bypass !== b.bypass) return false;

  return (
    Math.abs(a.top - b.top) <= epsilonPx &&
    Math.abs(a.right - b.right) <= epsilonPx &&
    Math.abs(a.bottom - b.bottom) <= epsilonPx &&
    Math.abs(a.left - b.left) <= epsilonPx &&
    Math.abs(a.width - b.width) <= epsilonPx &&
    Math.abs(a.height - b.height) <= epsilonPx
  );
}
