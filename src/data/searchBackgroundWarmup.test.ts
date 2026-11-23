import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as searchRepo from './searchRepository';
import {
  escalateSearchBackgroundWarmup,
  isSaveDataEnabled,
  resetSearchBackgroundWarmup,
  scheduleSearchBackgroundWarmup,
} from './searchBackgroundWarmup';

describe('searchBackgroundWarmup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchRepo.clearSearchRepositoryCache();
    resetSearchBackgroundWarmup();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetSearchBackgroundWarmup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits until idle timer fires, then loads stars, planets, and minor-bodies when saveData is false', async () => {
    const fetchShardSpy = vi
      .spyOn(searchRepo, 'fetchSearchShard')
      .mockResolvedValue([]);

    vi.stubGlobal('requestIdleCallback', undefined);

    scheduleSearchBackgroundWarmup(1000);
    expect(fetchShardSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetchShardSpy).toHaveBeenCalledWith('stars');
    expect(fetchShardSpy).toHaveBeenCalledWith('planets');
    expect(fetchShardSpy).toHaveBeenCalledWith('minor-bodies');
  });

  it('skips minor-bodies background warm-up when navigator.connection.saveData is true', async () => {
    const fetchShardSpy = vi
      .spyOn(searchRepo, 'fetchSearchShard')
      .mockResolvedValue([]);

    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('navigator', { connection: { saveData: true } });

    expect(isSaveDataEnabled()).toBe(true);
    scheduleSearchBackgroundWarmup(500);
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchShardSpy).toHaveBeenCalledWith('stars');
    expect(fetchShardSpy).toHaveBeenCalledWith('planets');
    expect(fetchShardSpy).not.toHaveBeenCalledWith('minor-bodies');
  });

  it('cancels idle delay and escalates immediately on Search user intent', async () => {
    const fetchShardSpy = vi
      .spyOn(searchRepo, 'fetchSearchShard')
      .mockResolvedValue([]);

    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('navigator', { connection: { saveData: true } });

    scheduleSearchBackgroundWarmup(5000);
    expect(fetchShardSpy).not.toHaveBeenCalled();

    escalateSearchBackgroundWarmup();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchShardSpy).toHaveBeenCalledWith('stars');
    expect(fetchShardSpy).toHaveBeenCalledWith('planets');
    expect(fetchShardSpy).toHaveBeenCalledWith('minor-bodies');
  });

  it('defers requestIdleCallback until delayMs elapses instead of firing immediately on mount', async () => {
    const fetchShardSpy = vi
      .spyOn(searchRepo, 'fetchSearchShard')
      .mockResolvedValue([]);

    const ricSpy = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 });
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', ricSpy);

    scheduleSearchBackgroundWarmup(2000);
    expect(ricSpy).not.toHaveBeenCalled();
    expect(fetchShardSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1999);
    expect(ricSpy).not.toHaveBeenCalled();
    expect(fetchShardSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(ricSpy).toHaveBeenCalledTimes(1);
    expect(ricSpy).toHaveBeenCalledWith(expect.any(Function));
    expect(fetchShardSpy).toHaveBeenCalledWith('stars');
  });

  it('defaults delayMs to 8000ms before triggering background warm-up', async () => {
    const fetchShardSpy = vi
      .spyOn(searchRepo, 'fetchSearchShard')
      .mockResolvedValue([]);

    vi.stubGlobal('requestIdleCallback', undefined);

    scheduleSearchBackgroundWarmup();
    await vi.advanceTimersByTimeAsync(7999);
    expect(fetchShardSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchShardSpy).toHaveBeenCalledWith('stars');
  });
});
