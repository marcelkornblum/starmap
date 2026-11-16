import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cancelHoverPrefetch,
  prefetchEntitySelection,
  scheduleHoverPrefetch,
} from './prefetchEntitySelection';
import * as detailsRepo from '../../data/detailsRepository';
import * as layerRepo from '../../data/layerRepository';

describe('prefetchEntitySelection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('no-ops when running in test mode without forceInTest', () => {
    const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord').mockResolvedValue(undefined as never);
    prefetchEntitySelection('sol', 'sol');
    expect(fetchDetailSpy).not.toHaveBeenCalled();
  });

  it('prefetches details, summary, and annotations when forceInTest is true', () => {
    vi.spyOn(detailsRepo, 'getCachedDetailRecord').mockReturnValue(undefined);
    vi.spyOn(detailsRepo, 'getCachedSummaryNode').mockReturnValue(undefined);
    vi.spyOn(layerRepo, 'areEntityAnnotationsCached').mockReturnValue(false);

    const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord').mockResolvedValue(undefined as never);
    const fetchSummarySpy = vi.spyOn(detailsRepo, 'fetchSummaryNode').mockResolvedValue(undefined as never);
    const fetchAnnotationsSpy = vi.spyOn(layerRepo, 'fetchEntityAnnotations').mockResolvedValue(undefined as never);

    prefetchEntitySelection('earth', 'sol', true);

    expect(fetchDetailSpy).toHaveBeenCalledWith('sol');
    expect(fetchDetailSpy).toHaveBeenCalledWith('earth');
    expect(fetchSummarySpy).toHaveBeenCalledWith('sol');
    expect(fetchAnnotationsSpy).toHaveBeenCalled();
  });

  it('skips fetch when records are already cached', () => {
    vi.spyOn(detailsRepo, 'getCachedDetailRecord').mockReturnValue({ kind: 'system', record: {} as never });
    vi.spyOn(detailsRepo, 'getCachedSummaryNode').mockReturnValue({} as never);
    vi.spyOn(layerRepo, 'areEntityAnnotationsCached').mockReturnValue(true);

    const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord');
    const fetchSummarySpy = vi.spyOn(detailsRepo, 'fetchSummaryNode');
    const fetchAnnotationsSpy = vi.spyOn(layerRepo, 'fetchEntityAnnotations');

    prefetchEntitySelection('sol', 'sol', true);

    expect(fetchDetailSpy).not.toHaveBeenCalled();
    expect(fetchSummarySpy).not.toHaveBeenCalled();
    expect(fetchAnnotationsSpy).not.toHaveBeenCalled();
  });

  it('handles null, undefined, or empty ids gracefully', () => {
    const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord');
    prefetchEntitySelection(null, undefined, true);
    prefetchEntitySelection('', '', true);
    expect(fetchDetailSpy).not.toHaveBeenCalled();
  });

  describe('scheduleHoverPrefetch & cancelHoverPrefetch', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      cancelHoverPrefetch();
      vi.useRealTimers();
    });

    it('schedules prefetch with 80ms debounce and calls prefetchEntitySelection when forced in test', () => {
      vi.spyOn(detailsRepo, 'getCachedDetailRecord').mockReturnValue(undefined);
      vi.spyOn(detailsRepo, 'getCachedSummaryNode').mockReturnValue(undefined);
      vi.spyOn(layerRepo, 'areEntityAnnotationsCached').mockReturnValue(true);
      const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord').mockResolvedValue(undefined as never);

      scheduleHoverPrefetch('sirius', 'sirius', 80, true);
      expect(fetchDetailSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(79);
      expect(fetchDetailSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fetchDetailSpy).toHaveBeenCalledWith('sirius');
    });

    it('cancels scheduled prefetch when cancelHoverPrefetch is called', () => {
      const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord').mockResolvedValue(undefined as never);

      scheduleHoverPrefetch('sirius', 'sirius', 80, true);
      cancelHoverPrefetch();

      vi.advanceTimersByTime(100);
      expect(fetchDetailSpy).not.toHaveBeenCalled();
    });

    it('resets timer when scheduleHoverPrefetch is called consecutively', () => {
      const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord').mockResolvedValue(undefined as never);

      scheduleHoverPrefetch('star-1', 'star-1', 80, true);
      vi.advanceTimersByTime(50);
      scheduleHoverPrefetch('star-2', 'star-2', 80, true);

      vi.advanceTimersByTime(50);
      expect(fetchDetailSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30);
      expect(fetchDetailSpy).not.toHaveBeenCalledWith('star-1');
      expect(fetchDetailSpy).toHaveBeenCalledWith('star-2');
    });

    it('no-ops in test mode without forceInTest', () => {
      const fetchDetailSpy = vi.spyOn(detailsRepo, 'fetchDetailRecord').mockResolvedValue(undefined as never);
      scheduleHoverPrefetch('sol', 'sol');
      vi.advanceTimersByTime(100);
      expect(fetchDetailSpy).not.toHaveBeenCalled();
    });
  });
});
