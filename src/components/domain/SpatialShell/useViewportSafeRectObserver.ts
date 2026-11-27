import { type RefObject, useEffect, useRef } from 'react';
import { useUIStore } from '../../../stores/useUIStore';
import { computeViewportSafeRect, type PanelRectLike } from '../../../utils/viewportSafeRect';
import { DESKTOP_DOCK_BREAKPOINT_PX } from './spatialShellHelpers';

const MOBILE_BREAKPOINT_PX = 768;
const FULL_WIDTH_SHEET_RATIO = 0.65;
const POST_FLIGHT_SETTLE_DELAY_MS = 180;

export interface SpatialShellRegionRefs {
  readonly shellRef: RefObject<HTMLElement | null>;
  readonly topBarRef: RefObject<HTMLElement | null>;
  readonly floatingLeftRef: RefObject<HTMLElement | null>;
  readonly bodiesRegionRef: RefObject<HTMLElement | null>;
  readonly controlsRegionRef?: RefObject<HTMLElement | null>;
}

function toPanelRectLike(rect: DOMRect): PanelRectLike {
  const { top, right, bottom, left, width, height } = rect;
  return { top, right, bottom, left, width, height };
}

function isElementVisible(el: HTMLElement): boolean {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return true;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function resolveBodiesRegion(
  bodiesEl: HTMLElement | null,
  isBodiesDrawerOpen: boolean,
  viewportWidth: number,
): PanelRectLike | null {
  const isBodiesVisible =
    bodiesEl !== null &&
    (isBodiesDrawerOpen || viewportWidth >= DESKTOP_DOCK_BREAKPOINT_PX) &&
    isElementVisible(bodiesEl);
  if (!isBodiesVisible) return null;

  const rawBodiesRect = toPanelRectLike(bodiesEl.getBoundingClientRect());
  const resolvedWidth = rawBodiesRect.width > 0 ? rawBodiesRect.width : bodiesEl.offsetWidth;
  if (resolvedWidth <= 0) return null;

  const resolvedLeft = Math.min(rawBodiesRect.left, Math.max(0, viewportWidth - resolvedWidth));
  return { ...rawBodiesRect, left: resolvedLeft, right: resolvedLeft + resolvedWidth, width: resolvedWidth };
}

function resolveMobileDetentSheet(
  floatingLeftItems: readonly PanelRectLike[],
  viewportWidth: number,
  detailsDetent: string,
): (PanelRectLike & { readonly detent: string }) | null {
  const candidates = floatingLeftItems.filter(
    (rect) =>
      rect.width > 0 &&
      rect.height > 0 &&
      (viewportWidth < MOBILE_BREAKPOINT_PX || rect.width >= viewportWidth * FULL_WIDTH_SHEET_RATIO),
  );
  if (candidates.length === 0) return null;
  const primarySheet = candidates.reduce((tallest, rect) => (rect.top < tallest.top ? rect : tallest));
  return { ...primarySheet, detent: detailsDetent };
}

/**
 * Observes active HUD region refs inside SpatialShell and publishes the
 * unobstructed 3D viewport safe rectangle to useUIStore.
 */
export function useViewportSafeRectObserver(
  refs: SpatialShellRegionRefs,
  isBodiesDrawerOpen: boolean,
): void {
  const {
    shellRef,
    topBarRef,
    floatingLeftRef,
    bodiesRegionRef,
    controlsRegionRef,
  } = refs;

  const isBodiesDrawerOpenRef = useRef(isBodiesDrawerOpen);
  const scheduleMeasureRef = useRef<(() => void) | null>(null);
  const hasMountedDrawerEffectRef = useRef(false);

  useEffect(() => {
    const shellEl = shellRef.current;
    if (!shellEl) return;

    let rafId: number | null = null;
    let settleTimerId: ReturnType<typeof setTimeout> | null = null;
    let deferredUntilSettle = false;

    const measure = () => {
      const shellRect = shellEl.getBoundingClientRect();
      const viewportWidth =
        shellRect.width > 0
          ? shellRect.width
          : typeof window !== 'undefined'
            ? window.innerWidth
            : 0;
      const viewportHeight =
        shellRect.height > 0
          ? shellRect.height
          : typeof window !== 'undefined'
            ? window.innerHeight
            : 0;

      const topBarEl = topBarRef.current;
      const floatingLeftEl = floatingLeftRef.current;
      const bodiesEl = bodiesRegionRef.current;
      const controlsEl = controlsRegionRef?.current ?? null;

      const topBar =
        topBarEl && isElementVisible(topBarEl)
          ? toPanelRectLike(topBarEl.getBoundingClientRect())
          : null;

      const floatingLeftItems = floatingLeftEl
        ? Array.from(floatingLeftEl.children).map((child) =>
            toPanelRectLike(child.getBoundingClientRect()),
          )
        : [];

      const detailsDetent = useUIStore.getState().detailsDetent;
      const mobileDetentSheet = resolveMobileDetentSheet(
        floatingLeftItems,
        viewportWidth,
        detailsDetent,
      );

      const bodiesRegion = resolveBodiesRegion(
        bodiesEl,
        isBodiesDrawerOpenRef.current,
        viewportWidth,
      );

      const controlsRegion =
        controlsEl && isElementVisible(controlsEl)
          ? toPanelRectLike(controlsEl.getBoundingClientRect())
          : null;

      const safeRect = computeViewportSafeRect(viewportWidth, viewportHeight, {
        topBar,
        floatingLeftItems,
        bodiesRegion,
        controlsRegion,
        mobileDetentSheet,
      });

      useUIStore.getState().setViewportSafeRect(safeRect);
    };

    const scheduleMeasure = () => {
      if (useUIStore.getState().isCameraTransitioning) {
        deferredUntilSettle = true;
        return;
      }
      if (rafId !== null) return;
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (useUIStore.getState().isCameraTransitioning) {
            deferredUntilSettle = true;
            return;
          }
          measure();
        });
      } else {
        measure();
      }
    };

    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => scheduleMeasure()) : null;

    const syncResizeObservers = () => {
      if (!resizeObserver) return;
      resizeObserver.disconnect();
      resizeObserver.observe(shellEl);

      const topBarEl = topBarRef.current;
      const floatingLeftEl = floatingLeftRef.current;
      const bodiesEl = bodiesRegionRef.current;
      const controlsEl = controlsRegionRef?.current ?? null;

      if (topBarEl) resizeObserver.observe(topBarEl);
      if (floatingLeftEl) {
        resizeObserver.observe(floatingLeftEl);
        for (const child of Array.from(floatingLeftEl.children)) {
          resizeObserver.observe(child);
        }
      }
      if (bodiesEl) resizeObserver.observe(bodiesEl);
      if (controlsEl) resizeObserver.observe(controlsEl);
    };

    const mutationObserver =
      typeof MutationObserver === 'function'
        ? new MutationObserver(() => {
            syncResizeObservers();
            scheduleMeasure();
          })
        : null;

    if (floatingLeftRef.current) {
      mutationObserver?.observe(floatingLeftRef.current, {
        childList: true,
        subtree: false,
      });
    }

    let prevDetailsDetent = useUIStore.getState().detailsDetent;
    let prevInFlight = useUIStore.getState().isCameraTransitioning;
    const unsubscribeDetent = useUIStore.subscribe((state) => {
      if (state.detailsDetent !== prevDetailsDetent) {
        prevDetailsDetent = state.detailsDetent;
        scheduleMeasure();
      }
      if (prevInFlight && !state.isCameraTransitioning) {
        prevInFlight = false;
        if (deferredUntilSettle) {
          deferredUntilSettle = false;
          if (settleTimerId !== null) {
            clearTimeout(settleTimerId);
          }
          settleTimerId = setTimeout(() => {
            settleTimerId = null;
            scheduleMeasure();
          }, POST_FLIGHT_SETTLE_DELAY_MS);
        }
      } else {
        if (state.isCameraTransitioning && settleTimerId !== null) {
          clearTimeout(settleTimerId);
          settleTimerId = null;
          deferredUntilSettle = true;
        }
        prevInFlight = state.isCameraTransitioning;
      }
    });

    const handleTransitionEnd = (event: Event) => {
      if ('propertyName' in event && (event as TransitionEvent).propertyName === 'opacity') {
        return;
      }
      scheduleMeasure();
    };
    shellEl.addEventListener('transitionend', handleTransitionEnd);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', scheduleMeasure);
    }

    scheduleMeasureRef.current = scheduleMeasure;
    syncResizeObservers();
    measure();

    return () => {
      scheduleMeasureRef.current = null;
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      if (settleTimerId !== null) {
        clearTimeout(settleTimerId);
      }
      unsubscribeDetent();
      shellEl.removeEventListener('transitionend', handleTransitionEnd);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', scheduleMeasure);
      }
      useUIStore.getState().setViewportSafeRect(null);
    };
  }, [
    shellRef,
    topBarRef,
    floatingLeftRef,
    bodiesRegionRef,
    controlsRegionRef,
  ]);

  useEffect(() => {
    isBodiesDrawerOpenRef.current = isBodiesDrawerOpen;
    if (!hasMountedDrawerEffectRef.current) {
      hasMountedDrawerEffectRef.current = true;
      return;
    }
    scheduleMeasureRef.current?.();
  }, [isBodiesDrawerOpen]);
}
