import { describe, it, expect } from 'vitest';
import { AdaptiveQualityController } from './adaptiveQualityController';

describe('AdaptiveQualityController', () => {
  it('ignores idle gaps (dtMs <= 0, dtMs > 250, or non-finite) under frameloop="demand"', () => {
    const controller = new AdaptiveQualityController({ initialDpr: 2, maxDpr: 2 });

    expect(controller.recordFrame(0)).toEqual({ action: 'none' });
    expect(controller.recordFrame(-16)).toEqual({ action: 'none' });
    expect(controller.recordFrame(251)).toEqual({ action: 'none' });
    expect(controller.recordFrame(5000)).toEqual({ action: 'none' });
    expect(controller.recordFrame(Number.NaN)).toEqual({ action: 'none' });

    expect(controller.getActiveSamples()).toBe(0);
    expect(controller.getEwmaMs()).toBeNull();
  });

  it('maintains EWMA (alpha = 0.2) across active samples', () => {
    const controller = new AdaptiveQualityController({ initialDpr: 2, maxDpr: 2 });

    controller.recordFrame(20);
    expect(controller.getActiveSamples()).toBe(1);
    expect(controller.getEwmaMs()).toBeCloseTo(20, 5);

    controller.recordFrame(30);
    expect(controller.getActiveSamples()).toBe(2);
    // 0.2 * 30 + 0.8 * 20 = 22
    expect(controller.getEwmaMs()).toBeCloseTo(22, 5);
  });

  it('steps DPR down by 0.25 after 12 active samples when ewmaMs > 36', () => {
    const controller = new AdaptiveQualityController({ initialDpr: 1.5, maxDpr: 1.5 });

    for (let i = 0; i < 11; i++) {
      expect(controller.recordFrame(42)).toEqual({ action: 'none' });
    }
    expect(controller.getActiveSamples()).toBe(11);

    const step1 = controller.recordFrame(42);
    expect(step1).toEqual({ action: 'dpr', nextDpr: 1.25 });
    expect(controller.getCurrentDpr()).toBe(1.25);
    expect(controller.getActiveSamples()).toBe(0);

    for (let i = 0; i < 11; i++) {
      expect(controller.recordFrame(42)).toEqual({ action: 'none' });
    }
    const step2 = controller.recordFrame(42);
    expect(step2).toEqual({ action: 'dpr', nextDpr: 1 });
    expect(controller.getCurrentDpr()).toBe(1);
  });

  it('requires ewmaMs > 45 before stepping cutoffMultiplier down when DPR is already 1', () => {
    const controller = new AdaptiveQualityController({ initialDpr: 1, maxDpr: 1 });

    // 40ms > 36ms, but <= 45ms -> should NOT step cutoff down
    for (let i = 0; i < 15; i++) {
      expect(controller.recordFrame(40)).toEqual({ action: 'none' });
    }
    expect(controller.getCutoffMultiplier()).toBe(1);

    // Now feed 50ms until EWMA > 45 and step cutoff down
    let result = controller.recordFrame(50);
    for (let i = 0; i < 20 && result.action === 'none'; i++) {
      result = controller.recordFrame(50);
    }
    expect(result).toEqual({ action: 'cutoff', nextCutoffMultiplier: 0.75 });
    expect(controller.getCutoffMultiplier()).toBe(0.75);

    // Step down once more to floor 0.5
    for (let i = 0; i < 11; i++) {
      expect(controller.recordFrame(50)).toEqual({ action: 'none' });
    }
    expect(controller.recordFrame(50)).toEqual({ action: 'cutoff', nextCutoffMultiplier: 0.5 });

    // Never drops below 0.5
    for (let i = 0; i < 15; i++) {
      expect(controller.recordFrame(60)).toEqual({ action: 'none' });
    }
    expect(controller.getCutoffMultiplier()).toBe(0.5);
  });

  it('recovers cutoffMultiplier toward 1.0 first, then DPR toward maxDpr after 45 samples < 20ms', () => {
    const controller = new AdaptiveQualityController({
      initialDpr: 1,
      maxDpr: 1.5,
      initialCutoffMultiplier: 0.75,
    });

    for (let i = 0; i < 44; i++) {
      expect(controller.recordFrame(14)).toEqual({ action: 'none' });
    }
    // 45th sample recovers cutoffMultiplier first
    expect(controller.recordFrame(14)).toEqual({ action: 'cutoff', nextCutoffMultiplier: 1 });
    expect(controller.getActiveSamples()).toBe(0);

    // Next 45 samples recover DPR toward maxDpr
    for (let i = 0; i < 44; i++) {
      expect(controller.recordFrame(14)).toEqual({ action: 'none' });
    }
    expect(controller.recordFrame(14)).toEqual({ action: 'dpr', nextDpr: 1.25 });

    for (let i = 0; i < 44; i++) {
      expect(controller.recordFrame(14)).toEqual({ action: 'none' });
    }
    expect(controller.recordFrame(14)).toEqual({ action: 'dpr', nextDpr: 1.5 });

    // Does not exceed maxDpr
    for (let i = 0; i < 50; i++) {
      expect(controller.recordFrame(10)).toEqual({ action: 'none' });
    }
    expect(controller.getCurrentDpr()).toBe(1.5);
  });

  it('syncMaxDpr updates maxDpr and clamps currentDpr down when needed', () => {
    const controller = new AdaptiveQualityController({ initialDpr: 2, maxDpr: 2 });
    expect(controller.syncMaxDpr(1)).toBe(true);
    expect(controller.getMaxDpr()).toBe(1);
    expect(controller.getCurrentDpr()).toBe(1);
  });
});
