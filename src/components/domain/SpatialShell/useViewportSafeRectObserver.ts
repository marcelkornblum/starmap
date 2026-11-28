import { type RefObject, useEffect, useRef } from 'react';
import { useUIStore } from '../../../stores/useUIStore';
import { computeViewportSafeRect } from '../../../utils/viewportSafeRect';
import {
  type FloatingLeftEntry,
  isElementVisible,
  MOBILE_BREAKPOINT_PX,
  resolveBodiesRegion,
  resolveMobileDetentSheet,
  toPanelRectLike,
} from './viewportSafeRectDomHelpers';

const POST_FLIGHT_SETTLE_DELAY_MS = 180;

export interface SpatialShellRegionRefs {
  readonly shellRef: RefObject<HTMLElement | null>;
  readonly topBarRef: RefObject<HTMLElement | null>;
  readonly discoverRegionRef?: RefObject<HTMLElement | null>;
  readonly floatingLeftRef: RefObject<HTMLElement | null>;
  readonly bodiesRegionRef: RefObject<HTMLElement | null>;
  readonly controlsRegionRef?: RefObject<HTMLElement | null>;
}

/**
 * Observes active HUD region refs inside SpatialShell and publishes the
 * unobstructed 3D viewport safe rectangle to useUIStore.
 */
export function useViewportSafeRectObserver(
  refs: SpatialShellRegionRefs,
  isBodiesDrawerOpen: boolean,
  isDiscoverOpen?: boolean,
): void {
  const {
    shellRef,
    topBarRef,
    discoverRegionRef,
    floatingLeftRef,
    bodiesRegionRef,
    controlsRegionRef,
  } = refs;

  const isBodiesDrawerOpenRef = useRef(isBodiesDrawerOpen);
  const scheduleMeasureRef = useRef<(() => void) | null>(null);
  const syncObserversRef = useRef<(() => void) | null>(null);
  const hasMountedDrawerEffectRef = useRef(false);
  const hasMountedDiscoverEffectRef = useRef(false);

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
      const discoverEl = discoverRegionRef?.current ?? null;
      const floatingLeftEl = floatingLeftRef.current;
      const bodiesEl = bodiesRegionRef.current;
      const controlsEl = controlsRegionRef?.current ?? null;

      const topBar =
        topBarEl && isElementVisible(topBarEl)
          ? toPanelRectLike(topBarEl.getBoundingClientRect())
          : null;

      const floatingLeftEntries: FloatingLeftEntry[] = floatingLeftEl
        ? Array.from(floatingLeftEl.children).map((element) => ({
            rect: toPanelRectLike(element.getBoundingClientRect()),
            element,
          }))
        : [];
      const floatingLeftItems = floatingLeftEntries.map((entry) => entry.rect);
      if (
        discoverEl &&
        viewportWidth >= MOBILE_BREAKPOINT_PX &&
        isElementVisible(discoverEl)
      ) {
        const discoverRect = toPanelRectLike(discoverEl.getBoundingClientRect());
        if (discoverRect.width > 0 && discoverRect.height > 0) {
          floatingLeftItems.push(discoverRect);
        }
      }

      const detailsDetent = useUIStore.getState().detailsDetent;
      const mobileDetentSheet = resolveMobileDetentSheet(
        floatingLeftEntries,
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
      const discoverEl = discoverRegionRef?.current ?? null;
      const floatingLeftEl = floatingLeftRef.current;
      const bodiesEl = bodiesRegionRef.current;
      const controlsEl = controlsRegionRef?.current ?? null;

      if (topBarEl) resizeObserver.observe(topBarEl);
      if (discoverEl) resizeObserver.observe(discoverEl);
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
    let prevIsDiscoverOpen = useUIStore.getState().isDiscoverOpen;
    let prevInFlight = useUIStore.getState().isCameraTransitioning;
    const unsubscribeDetent = useUIStore.subscribe((state) => {
      if (state.detailsDetent !== prevDetailsDetent) {
        prevDetailsDetent = state.detailsDetent;
        scheduleMeasure();
      }
      if (state.isDiscoverOpen !== prevIsDiscoverOpen) {
        prevIsDiscoverOpen = state.isDiscoverOpen;
        syncResizeObservers();
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
    syncObserversRef.current = syncResizeObservers;
    syncResizeObservers();
    measure();

    return () => {
      scheduleMeasureRef.current = null;
      syncObserversRef.current = null;
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
    discoverRegionRef,
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

  useEffect(() => {
    if (!hasMountedDiscoverEffectRef.current) {
      hasMountedDiscoverEffectRef.current = true;
      return;
    }
    syncObserversRef.current?.();
    scheduleMeasureRef.current?.();
  }, [isDiscoverOpen]);
}
