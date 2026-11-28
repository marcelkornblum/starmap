import { type PanelRectLike } from '../../../utils/viewportSafeRect';
import { DESKTOP_DOCK_BREAKPOINT_PX } from './spatialShellHelpers';

export const MOBILE_BREAKPOINT_PX = 768;
const FULL_WIDTH_SHEET_RATIO = 0.65;

export function toPanelRectLike(rect: DOMRect): PanelRectLike {
  const { top, right, bottom, left, width, height } = rect;
  return { top, right, bottom, left, width, height };
}

export function isElementVisible(el: HTMLElement): boolean {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return true;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function resolveBodiesRegion(
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

export interface FloatingLeftEntry {
  readonly rect: PanelRectLike;
  readonly element: Element;
}

export interface ResolvedMobileDetentSheet extends PanelRectLike {
  readonly detent: string;
  readonly beyondPartial: boolean;
  readonly partialHeightPx?: number;
}

function resolveDetentHostElement(element: Element): Element {
  return element.hasAttribute('data-detent')
    ? element
    : (element.querySelector('[data-detent]') ?? element);
}

export function resolveMobileDetentSheet(
  floatingLeftEntries: readonly FloatingLeftEntry[],
  viewportWidth: number,
  detailsDetent: string,
): ResolvedMobileDetentSheet | null {
  const candidates = floatingLeftEntries.filter(
    ({ rect }) =>
      rect.width > 0 &&
      rect.height > 0 &&
      (viewportWidth < MOBILE_BREAKPOINT_PX || rect.width >= viewportWidth * FULL_WIDTH_SHEET_RATIO),
  );
  if (candidates.length === 0) return null;
  const primary = candidates.reduce((tallest, entry) =>
    entry.rect.top < tallest.rect.top ? entry : tallest,
  );
  const detentEl = resolveDetentHostElement(primary.element);
  const detent = detentEl.getAttribute('data-detent') ?? detailsDetent;
  const beyondPartial = detentEl.getAttribute('data-beyond-partial') === 'true';
  const rawPartialHeight = detentEl.getAttribute('data-partial-height-px');
  const parsedPartialHeight = rawPartialHeight !== null ? Number(rawPartialHeight) : Number.NaN;
  const partialHeightPx =
    Number.isFinite(parsedPartialHeight) && parsedPartialHeight > 0
      ? parsedPartialHeight
      : undefined;

  return {
    ...primary.rect,
    detent,
    beyondPartial,
    ...(partialHeightPx !== undefined ? { partialHeightPx } : {}),
  };
}
