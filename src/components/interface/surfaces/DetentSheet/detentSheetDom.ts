import {
  type DetentLevel,
  type MeasuredSheetMetrics,
  DEFAULT_PEEK_HEIGHT_PX,
  computePartialSheetHeightPx,
  computeDetentExpandProgress,
  formatDetentExpandProgress,
} from './detentSheetMath';

function resolveStageElement(sheet: HTMLElement | null): HTMLElement | null {
  if (!sheet) return null;
  const markedStage = sheet.closest<HTMLElement>('[data-detent-stage="true"]');
  if (markedStage) return markedStage;
  const parent = sheet.parentElement;
  if (!parent) return null;
  const sheetH = sheet.offsetHeight;
  if (parent.clientHeight > 0 && sheetH > 0 && parent.clientHeight <= sheetH + 4 && parent.parentElement) {
    return parent.parentElement;
  }
  return parent;
}

/**
 * Measures available stage height, intrinsic peek height (excluding mid-stage), and mid-stage scrollHeight.
 */
export function measureDetentSheetMetrics(
  sheet: HTMLElement | null,
  dragHandle: HTMLElement | null,
  peekSection: HTMLElement | null,
  fallbackViewportHeight: number,
): MeasuredSheetMetrics {
  const stageEl = resolveStageElement(sheet);
  const stageHeightPx = stageEl?.clientHeight || fallbackViewportHeight;
  if (!sheet) {
    return { stageHeightPx, peekHeightPx: DEFAULT_PEEK_HEIGHT_PX, midStageNaturalPx: 0 };
  }
  const midInner = sheet.querySelector<HTMLElement>('[data-detent-mid-inner="true"]');
  const midStage = sheet.querySelector<HTMLElement>('[data-detent-mid-stage="true"]');
  const midStageNaturalPx = midInner ? Math.ceil(midInner.scrollHeight) : 0;

  const handleH = dragHandle?.offsetHeight ?? 0;
  const peekRawH = peekSection ? Math.max(peekSection.offsetHeight, peekSection.scrollHeight) : 0;
  const midVisibleH = midStage ? midStage.getBoundingClientRect().height || midStage.offsetHeight : 0;
  const peekWithoutMidH = Math.max(0, peekRawH - midVisibleH);

  let measuredPeekPx = 0;
  if (handleH > 0 || peekWithoutMidH > 0) {
    const cs = typeof window !== 'undefined' ? window.getComputedStyle(sheet) : null;
    const padBlock = cs ? (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) : 0;
    const borderBlock = cs ? (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) : 0;
    const rowGap = cs ? parseFloat(cs.rowGap) || 0 : 0;
    measuredPeekPx = Math.ceil(padBlock + borderBlock + handleH + rowGap + peekWithoutMidH);
  }

  return {
    stageHeightPx,
    peekHeightPx: measuredPeekPx > 0 ? measuredPeekPx : DEFAULT_PEEK_HEIGHT_PX,
    midStageNaturalPx,
  };
}

/**
 * Reads the current sheet height from its scoped CSS variable or bounding rect.
 */
export function readDetentSheetHeightPx(sheet: HTMLElement | null, fallbackPx: number): number {
  if (!sheet) return fallbackPx;
  const fromVar = parseFloat(sheet.style.getPropertyValue('--detent-sheet-block-size') || '0');
  if (fromVar > 0) return fromVar;
  return sheet.getBoundingClientRect().height || fallbackPx;
}

function setCssVarIfChanged(el: HTMLElement, prop: string, value: string): void {
  if (el.style.getPropertyValue(prop) !== value) {
    el.style.setProperty(prop, value);
  }
}

/**
 * Applies scoped CSS custom properties for sheet block-size, mid-stage height, and expand progress.
 * Returns derived flags for React attribute state synchronization.
 */
export function applyDetentSheetCssVars(
  sheet: HTMLElement | null,
  heightPx: number,
  detent: DetentLevel,
  metrics: MeasuredSheetMetrics,
): { readonly beyondPartial: boolean; readonly peekHeightPx: number; readonly scrollable: boolean } {
  const partialH = computePartialSheetHeightPx({
    peekHeightPx: metrics.peekHeightPx,
    midStageNaturalPx: metrics.midStageNaturalPx,
    viewportHeightPx: metrics.stageHeightPx,
  });
  const beyondPartial = heightPx > partialH + 4 || detent === 'full';
  const partialClamped = detent === 'partial' && metrics.peekHeightPx + metrics.midStageNaturalPx > partialH + 4;
  const scrollable = detent === 'full' || beyondPartial || partialClamped;
  if (!sheet) {
    return { beyondPartial, peekHeightPx: metrics.peekHeightPx, scrollable };
  }
  const progress = computeDetentExpandProgress(heightPx, metrics.peekHeightPx, partialH);
  // DEC-R051: Sanctioned scoped custom properties for mobile DetentSheet choreography
  setCssVarIfChanged(sheet, '--detent-sheet-block-size', `${Math.round(heightPx)}px`);
  setCssVarIfChanged(sheet, '--detent-mid-stage-size', `${Math.round(metrics.midStageNaturalPx)}px`);
  setCssVarIfChanged(sheet, '--detent-expand-progress', formatDetentExpandProgress(progress));
  return { beyondPartial, peekHeightPx: metrics.peekHeightPx, scrollable };
}

/**
 * Subscribes to ResizeObserver (parent, peek, mid-inner — excluding sheet itself to avoid feedback loops),
 * MutationObserver on peekSection to re-bind when mid-inner node reference changes, and window resize.
 */
export function observeDetentSheetLayout(
  sheet: HTMLElement,
  peekSection: HTMLElement | null,
  onLayout: () => void,
): () => void {
  onLayout();
  let observer: ResizeObserver | null = null;
  let currentMidInner = sheet.querySelector<HTMLElement>('[data-detent-mid-inner="true"]');

  const bindResizeObserver = () => {
    observer?.disconnect();
    if (typeof ResizeObserver === 'undefined') return;
    observer = new ResizeObserver(onLayout);
    const stageEl = resolveStageElement(sheet);
    if (stageEl) observer.observe(stageEl);
    if (peekSection) observer.observe(peekSection);
    if (currentMidInner) observer.observe(currentMidInner);
  };

  bindResizeObserver();

  let mutationObserver: MutationObserver | null = null;
  if (peekSection && typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(() => {
      const nextMidInner = sheet.querySelector<HTMLElement>('[data-detent-mid-inner="true"]');
      if (nextMidInner !== currentMidInner) {
        currentMidInner = nextMidInner;
        bindResizeObserver();
        onLayout();
      }
    });
    mutationObserver.observe(peekSection, { childList: true, subtree: true });
  }

  window.addEventListener('resize', onLayout);
  return () => {
    observer?.disconnect();
    mutationObserver?.disconnect();
    window.removeEventListener('resize', onLayout);
  };
}

/**
 * Registers non-passive touch listeners on the sheet element for full-panel mobile drag.
 */
export function bindDetentTouchListeners(
  sheet: HTMLElement,
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  },
): () => void {
  sheet.addEventListener('touchstart', handlers.onTouchStart, { passive: false });
  sheet.addEventListener('touchmove', handlers.onTouchMove, { passive: false });
  sheet.addEventListener('touchend', handlers.onTouchEnd, { passive: false });
  sheet.addEventListener('touchcancel', handlers.onTouchEnd, { passive: false });
  return () => {
    sheet.removeEventListener('touchstart', handlers.onTouchStart);
    sheet.removeEventListener('touchmove', handlers.onTouchMove);
    sheet.removeEventListener('touchend', handlers.onTouchEnd);
    sheet.removeEventListener('touchcancel', handlers.onTouchEnd);
  };
}

/**
 * Registers window-level pointer move/up/cancel listeners while a pointer drag session is active.
 */
export function bindDetentWindowPointerListeners(handlers: {
  onMove: (e: globalThis.PointerEvent) => void;
  onRelease: () => void;
}): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('pointermove', handlers.onMove);
  window.addEventListener('pointerup', handlers.onRelease);
  window.addEventListener('pointercancel', handlers.onRelease);
  return () => {
    window.removeEventListener('pointermove', handlers.onMove);
    window.removeEventListener('pointerup', handlers.onRelease);
    window.removeEventListener('pointercancel', handlers.onRelease);
  };
}
