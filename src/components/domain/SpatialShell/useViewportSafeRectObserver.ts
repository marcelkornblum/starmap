import { type RefObject, useEffect } from 'react';
import { useUIStore } from '../../../stores/useUIStore';
import { computeViewportSafeRect, type PanelRectLike } from '../../../utils/viewportSafeRect';

const MOBILE_BREAKPOINT_PX = 768;
const DESKTOP_DOCK_BREAKPOINT_PX = 1024;
const FULL_WIDTH_SHEET_RATIO = 0.65;

interface HudRegionElements {
  readonly topBarEl: HTMLElement | null;
  readonly floatingLeftEl: HTMLElement | null;
  readonly bodiesEl: HTMLElement | null;
  readonly controlsEl: HTMLElement | null;
}

function queryHudRegions(shellEl: HTMLElement): HudRegionElements {
  return {
    topBarEl: shellEl.querySelector<HTMLElement>('[data-spatial-region="top-bar"]'),
    floatingLeftEl: shellEl.querySelector<HTMLElement>('[data-spatial-region="floating-left"]'),
    bodiesEl: shellEl.querySelector<HTMLElement>('[data-spatial-region="bodies"]'),
    controlsEl: shellEl.querySelector<HTMLElement>('[data-spatial-region="controls"]'),
  };
}

function toPanelRectLike(rect: DOMRect): PanelRectLike {
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isElementVisible(el: HTMLElement): boolean {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return true;
  }
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/**
 * Observes individual active HUD panels inside SpatialShell and publishes the
 * unobstructed 3D viewport safe rectangle to useUIStore.
 */
export function useViewportSafeRectObserver(
  shellRef: RefObject<HTMLElement | null>,
  isBodiesDrawerOpen: boolean,
): void {
  useEffect(() => {
    const shellEl = shellRef.current;
    if (!shellEl) return;

    let rafId: number | null = null;

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

      const { topBarEl, floatingLeftEl, bodiesEl, controlsEl } = queryHudRegions(shellEl);

      const topBar =
        topBarEl && isElementVisible(topBarEl)
          ? toPanelRectLike(topBarEl.getBoundingClientRect())
          : null;

      const floatingLeftItems = floatingLeftEl
        ? Array.from(floatingLeftEl.children).map((child) =>
            toPanelRectLike(child.getBoundingClientRect()),
          )
        : [];

      const detentEl = floatingLeftEl?.querySelector<HTMLElement>('[data-detent]') ?? null;
      const detentRect = detentEl ? toPanelRectLike(detentEl.getBoundingClientRect()) : null;
      const isMobileDetentSheet =
        detentEl !== null &&
        detentRect !== null &&
        (viewportWidth < MOBILE_BREAKPOINT_PX ||
          detentRect.width >= viewportWidth * FULL_WIDTH_SHEET_RATIO);
      const mobileDetentSheet = isMobileDetentSheet
        ? {
            ...detentRect,
            detent: detentEl.getAttribute('data-detent'),
          }
        : null;

      const isBodiesVisible =
        bodiesEl !== null &&
        (isBodiesDrawerOpen || viewportWidth >= DESKTOP_DOCK_BREAKPOINT_PX) &&
        isElementVisible(bodiesEl);
      let bodiesRegion: PanelRectLike | null = null;
      if (isBodiesVisible) {
        const rawBodiesRect = toPanelRectLike(bodiesEl.getBoundingClientRect());
        const resolvedWidth =
          rawBodiesRect.width > 0 ? rawBodiesRect.width : bodiesEl.offsetWidth;
        if (resolvedWidth > 0) {
          // Account for in-flight slide-in CSS transforms (translateX(100%) -> 0) on <= 1023px drawers
          // so optical-centre compensation glides immediately in sync with the opening drawer.
          const resolvedLeft = Math.min(
            rawBodiesRect.left,
            Math.max(0, viewportWidth - resolvedWidth),
          );
          bodiesRegion = {
            ...rawBodiesRect,
            left: resolvedLeft,
            right: resolvedLeft + resolvedWidth,
            width: resolvedWidth,
          };
        }
      }

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
      if (rafId !== null) return;
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(() => {
          rafId = null;
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

      const { topBarEl, floatingLeftEl, bodiesEl, controlsEl } = queryHudRegions(shellEl);
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

    mutationObserver?.observe(shellEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-detent', 'data-bodies-drawer-open'],
    });

    const handleTransitionEnd = () => scheduleMeasure();
    const { bodiesEl: initialBodiesEl } = queryHudRegions(shellEl);
    initialBodiesEl?.addEventListener('transitionend', handleTransitionEnd);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', scheduleMeasure);
    }

    syncResizeObservers();
    measure();

    return () => {
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      initialBodiesEl?.removeEventListener('transitionend', handleTransitionEnd);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', scheduleMeasure);
      }
      useUIStore.getState().setViewportSafeRect(null);
    };
  }, [shellRef, isBodiesDrawerOpen]);
}
