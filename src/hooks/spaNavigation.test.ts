// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSpaNavigation } from './spaNavigation';
import { registerAppRouter } from './useSpaLocation';
import { useCameraStore } from '../stores/useCameraStore';

describe('handleSpaNavigation', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    registerAppRouter({
      navigate: mockNavigate,
      history: { push: mockNavigate },
    });
  });

  const createMockEvent = (overrides: Partial<MouseEvent> = {}): MouseEvent => {
    return {
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    } as unknown as MouseEvent;
  };

  it('navigates via appRouter for relative internal href', () => {
    const event = createMockEvent();
    const result = handleSpaNavigation(event, '/galaxy?focus=tau-ceti');

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ href: '/galaxy?focus=tau-ceti' });
  });

  it('triggers camera recenter when href includes center parameter', () => {
    const recenterSpy = vi.spyOn(useCameraStore.getState(), 'triggerRecenter');
    const event = createMockEvent();
    handleSpaNavigation(event, '/galaxy?center=sol&focus=sol');

    expect(recenterSpy).toHaveBeenCalled();
  });

  it('ignores external URLs, anchors, mailto, and tel', () => {
    const event = createMockEvent();

    expect(handleSpaNavigation(event, 'https://example.com')).toBe(false);
    expect(handleSpaNavigation(event, 'http://example.com')).toBe(false);
    expect(handleSpaNavigation(event, '#section')).toBe(false);
    expect(handleSpaNavigation(event, 'mailto:test@example.com')).toBe(false);
    expect(handleSpaNavigation(event, 'tel:123456')).toBe(false);
    expect(handleSpaNavigation(event, '//cdn.example.com')).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ignores modified clicks (meta, ctrl, shift, alt, right button)', () => {
    const metaEvent = createMockEvent({ metaKey: true });
    expect(handleSpaNavigation(metaEvent, '/galaxy')).toBe(false);

    const ctrlEvent = createMockEvent({ ctrlKey: true });
    expect(handleSpaNavigation(ctrlEvent, '/galaxy')).toBe(false);

    const shiftEvent = createMockEvent({ shiftKey: true });
    expect(handleSpaNavigation(shiftEvent, '/galaxy')).toBe(false);

    const altEvent = createMockEvent({ altKey: true });
    expect(handleSpaNavigation(altEvent, '/galaxy')).toBe(false);

    const rightClickEvent = createMockEvent({ button: 2 });
    expect(handleSpaNavigation(rightClickEvent, '/galaxy')).toBe(false);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ignores already default-prevented events or empty href', () => {
    const preventedEvent = createMockEvent({ defaultPrevented: true });
    expect(handleSpaNavigation(preventedEvent, '/galaxy')).toBe(false);
    expect(handleSpaNavigation(createMockEvent(), '')).toBe(false);
    expect(handleSpaNavigation(createMockEvent(), undefined)).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates with actual router instance', async () => {
    const { router } = await import('../router');
    registerAppRouter(router);

    // Step 1: navigate to /galaxy?focus=tau-ceti
    const event1 = createMockEvent();
    handleSpaNavigation(event1, '/galaxy?focus=tau-ceti');
    await new Promise((r) => setTimeout(r, 50));
    expect(router.state.location.pathname).toBe('/galaxy');
    expect(router.state.location.search).toEqual({ focus: 'tau-ceti' });

    // Step 2: navigate to /galaxy?focus=tau-ceti&route=sol,gaia-2452378776434477184
    const event2 = createMockEvent();
    handleSpaNavigation(event2, '/galaxy?focus=tau-ceti&route=sol,gaia-2452378776434477184');
    await new Promise((r) => setTimeout(r, 50));
    expect(router.state.location.pathname).toBe('/galaxy');
    expect(router.state.location.search).toEqual({
      focus: 'tau-ceti',
      route: 'sol,gaia-2452378776434477184',
    });
  });
});
