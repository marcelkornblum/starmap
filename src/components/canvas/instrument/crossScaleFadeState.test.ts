import { describe, it, expect, afterEach } from 'vitest';
import { CrossScaleChoreographyController } from './CrossScaleChoreographyContext';
import {
  getCrossScaleInstrumentFade,
  setCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from './crossScaleFadeState';

describe('crossScaleFadeState', () => {
  afterEach(() => {
    resetCrossScaleInstrumentFade();
  });

  it('defaults to 1.0', () => {
    expect(getCrossScaleInstrumentFade()).toBe(1.0);
  });

  it('updates and clamps values to [0, 1]', () => {
    setCrossScaleInstrumentFade(0.45);
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(0.45);

    setCrossScaleInstrumentFade(-0.5);
    expect(getCrossScaleInstrumentFade()).toBe(0);

    setCrossScaleInstrumentFade(2.5);
    expect(getCrossScaleInstrumentFade()).toBe(1);
  });

  it('guards against NaN and non-finite values without poisoning state', () => {
    setCrossScaleInstrumentFade(0.3);
    setCrossScaleInstrumentFade(Number.NaN);
    expect(Number.isFinite(getCrossScaleInstrumentFade())).toBe(true);
    expect(getCrossScaleInstrumentFade()).toBe(1.0);

    setCrossScaleInstrumentFade(Number.POSITIVE_INFINITY);
    expect(getCrossScaleInstrumentFade()).toBe(1.0);

    setCrossScaleInstrumentFade(Number.NEGATIVE_INFINITY);
    expect(getCrossScaleInstrumentFade()).toBe(0);
  });

  it('resets back to 1.0', () => {
    setCrossScaleInstrumentFade(0.1);
    expect(getCrossScaleInstrumentFade()).toBeCloseTo(0.1);

    resetCrossScaleInstrumentFade();
    expect(getCrossScaleInstrumentFade()).toBe(1.0);
  });

  it('isolates fade state per CrossScaleChoreographyController instance', () => {
    const controllerA = new CrossScaleChoreographyController();
    const controllerB = new CrossScaleChoreographyController();

    setCrossScaleInstrumentFade(0.2, controllerA);
    expect(getCrossScaleInstrumentFade(controllerA)).toBeCloseTo(0.2);
    expect(getCrossScaleInstrumentFade(controllerB)).toBe(1.0);

    resetCrossScaleInstrumentFade(controllerA);
    expect(getCrossScaleInstrumentFade(controllerA)).toBe(1.0);
  });
});
