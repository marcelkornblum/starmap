import { describe, expect, it } from 'vitest';
import {
  isElementVisible,
  resolveBodiesRegion,
  resolveMobileDetentSheet,
  toPanelRectLike,
} from './viewportSafeRectDomHelpers';

function createRectElement(
  rect: { left: number; top: number; width: number; height: number },
  attrs: Record<string, string> = {},
): HTMLElement {
  const el = document.createElement('div');
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, val);
  }
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect,
    }),
  });
  return el;
}

describe('viewportSafeRectDomHelpers', () => {
  it('converts DOMRect to PanelRectLike and checks computed visibility', () => {
    const visibleEl = createRectElement({ left: 8, top: 12, width: 320, height: 180 });
    expect(isElementVisible(visibleEl)).toBe(true);
    expect(toPanelRectLike(visibleEl.getBoundingClientRect())).toEqual({
      left: 8,
      top: 12,
      right: 328,
      bottom: 192,
      width: 320,
      height: 180,
    });

    const hiddenEl = createRectElement({ left: 0, top: 0, width: 100, height: 100 });
    hiddenEl.style.display = 'none';
    document.body.appendChild(hiddenEl);
    expect(isElementVisible(hiddenEl)).toBe(false);
    hiddenEl.remove();
  });

  it('resolves bodies region clamping slide-in left edge on tablet and omitting when closed below 1280px', () => {
    const el = createRectElement({ left: 1024, top: 0, width: 384, height: 768 });
    expect(resolveBodiesRegion(el, false, 1024)).toBeNull();
    expect(resolveBodiesRegion(el, true, 1024)).toEqual({
      left: 640,
      top: 0,
      right: 1024,
      bottom: 768,
      width: 384,
      height: 768,
    });
  });

  it('resolves tallest mobile detent sheet with data-detent, beyond-partial, and partialHeightPx metadata', () => {
    const child = createRectElement(
      { left: 0, top: 120, width: 390, height: 724 },
      {
        'data-detent': 'partial',
        'data-beyond-partial': 'true',
        'data-partial-height-px': '360',
      },
    );
    const resolved = resolveMobileDetentSheet(
      [{ rect: toPanelRectLike(child.getBoundingClientRect()), element: child }],
      390,
      'peek',
    );
    expect(resolved).toEqual({
      left: 0,
      top: 120,
      right: 390,
      bottom: 844,
      width: 390,
      height: 724,
      detent: 'partial',
      beyondPartial: true,
      partialHeightPx: 360,
    });
  });
});
