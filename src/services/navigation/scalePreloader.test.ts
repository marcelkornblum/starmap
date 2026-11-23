import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as detailsRepository from '../../data/detailsRepository';
import {
  preloadSceneEntry,
  preloadSpatialView,
  preloadSystemData,
  preloadTargetScaleEntry,
  registerSceneEntryPreloader,
  registerSpatialViewPreloader,
} from './scalePreloader';

describe('scalePreloader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerSpatialViewPreloader(null);
    registerSceneEntryPreloader(null);
  });

  afterEach(() => {
    registerSpatialViewPreloader(null);
    registerSceneEntryPreloader(null);
  });

  it('delegates preloadSpatialView to the registered view preloader or resolves when unregistered', async () => {
    await expect(preloadSpatialView('galaxy')).resolves.toBeUndefined();

    const viewPreloader = vi.fn().mockResolvedValue({ loaded: true });
    registerSpatialViewPreloader(viewPreloader);

    await expect(preloadSpatialView('system')).resolves.toEqual({ loaded: true });
    expect(viewPreloader).toHaveBeenCalledWith('system');
  });

  it('delegates preloadSceneEntry to the registered scene-entry preloader or resolves when unregistered', async () => {
    await expect(preloadSceneEntry('planet')).resolves.toBeUndefined();

    const scenePreloader = vi.fn().mockResolvedValue('scene-module');
    registerSceneEntryPreloader(scenePreloader);

    await expect(preloadSceneEntry('planet')).resolves.toBe('scene-module');
    expect(scenePreloader).toHaveBeenCalledWith('planet');
  });

  it('skips network fetches in test mode unless forceInTest is true', async () => {
    const fetchDetailSpy = vi.spyOn(detailsRepository, 'fetchDetailRecord');
    const fetchSummarySpy = vi.spyOn(detailsRepository, 'fetchSummaryNode');

    await preloadSystemData('target-system-id');
    expect(fetchDetailSpy).not.toHaveBeenCalled();
    expect(fetchSummarySpy).not.toHaveBeenCalled();

    await preloadSystemData(undefined, true);
    expect(fetchDetailSpy).not.toHaveBeenCalled();
  });

  it('fetches uncached detail and summary records when forceInTest is enabled and swallows fetch failures', async () => {
    vi.spyOn(detailsRepository, 'getCachedDetailRecord').mockReturnValue(undefined);
    vi.spyOn(detailsRepository, 'getCachedSummaryNode').mockReturnValue(undefined);
    const fetchDetailSpy = vi
      .spyOn(detailsRepository, 'fetchDetailRecord')
      .mockRejectedValue(new Error('network error'));
    const fetchSummarySpy = vi
      .spyOn(detailsRepository, 'fetchSummaryNode')
      .mockResolvedValue(undefined);

    await expect(preloadSystemData('target-system-id', true)).resolves.toBeUndefined();
    expect(fetchDetailSpy).toHaveBeenCalledWith('target-system-id');
    expect(fetchSummarySpy).toHaveBeenCalledWith('target-system-id');
  });

  it('skips already cached detail or summary records in preloadSystemData', async () => {
    vi.spyOn(detailsRepository, 'getCachedDetailRecord').mockReturnValue({ id: 'cached' } as never);
    vi.spyOn(detailsRepository, 'getCachedSummaryNode').mockReturnValue({ id: 'cached' } as never);
    const fetchDetailSpy = vi.spyOn(detailsRepository, 'fetchDetailRecord');
    const fetchSummarySpy = vi.spyOn(detailsRepository, 'fetchSummaryNode');

    await preloadSystemData('target-system-id', true);
    expect(fetchDetailSpy).not.toHaveBeenCalled();
    expect(fetchSummarySpy).not.toHaveBeenCalled();
  });

  it('preloads scene entry, spatial view, and system data in parallel via preloadTargetScaleEntry', async () => {
    const scenePreloader = vi.fn().mockResolvedValue('scene');
    const viewPreloader = vi.fn().mockRejectedValue(new Error('view failed'));
    registerSceneEntryPreloader(scenePreloader);
    registerSpatialViewPreloader(viewPreloader);

    vi.spyOn(detailsRepository, 'getCachedDetailRecord').mockReturnValue(undefined);
    vi.spyOn(detailsRepository, 'getCachedSummaryNode').mockReturnValue(undefined);
    const fetchDetailSpy = vi
      .spyOn(detailsRepository, 'fetchDetailRecord')
      .mockResolvedValue(undefined);
    const fetchSummarySpy = vi
      .spyOn(detailsRepository, 'fetchSummaryNode')
      .mockResolvedValue(undefined);

    await expect(preloadTargetScaleEntry('system', 'target-system-id', true)).resolves.toBeDefined();
    expect(scenePreloader).toHaveBeenCalledWith('system');
    expect(viewPreloader).toHaveBeenCalledWith('system');
    expect(fetchDetailSpy).toHaveBeenCalledWith('target-system-id');
    expect(fetchSummarySpy).toHaveBeenCalledWith('target-system-id');
  });
});
