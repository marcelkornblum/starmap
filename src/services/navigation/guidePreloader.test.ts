import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  preloadGuideListViews,
  registerGuideViewsPreloader,
  resetGuideViewsPreloaderForTests,
} from './guidePreloader';

describe('guidePreloader', () => {
  beforeEach(() => {
    resetGuideViewsPreloaderForTests();
  });

  it('resolves cleanly when no preloader is registered', async () => {
    await expect(preloadGuideListViews()).resolves.toBeUndefined();
  });

  it('invokes the registered preloader and deduplicates concurrent/repeated calls', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);
    registerGuideViewsPreloader(loader);

    await Promise.all([preloadGuideListViews(), preloadGuideListViews()]);
    await preloadGuideListViews();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('allows retry if a registered preloader rejects', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('network glitch'))
      .mockResolvedValueOnce(undefined);
    registerGuideViewsPreloader(loader);

    await preloadGuideListViews();
    await preloadGuideListViews();

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
