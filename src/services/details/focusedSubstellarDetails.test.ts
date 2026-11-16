import { describe, expect, it } from 'vitest';
import {
  buildFocusedBeltDetails,
  buildFocusedMinorBodyDetails,
} from './focusedSubstellarDetails';

describe('focusedSubstellarDetails', () => {
  const base: any = {
    id: 'target',
    name: 'Target',
    systemId: 'sol',
    systemName: 'Sol',
    stars: [],
    planets: [],
    hazards: [],
  };

  it('builds belt entity details', () => {
    const details = buildFocusedBeltDetails(base, undefined, [
      {
        id: 'asteroid-belt',
        name: 'Asteroid Belt',
        kind: 'asteroid-belt',
        kindLabel: 'Asteroid Belt',
        href: '',
        innerRadiusAu: 2.1,
        outerRadiusAu: 3.3,
        semiMajorAxisAu: 2.7,
        composition: 'rock',
        guideHref: '',
      },
    ], []);

    expect(details.focusedKind).toBe('belt');
    expect(details.diskTelemetry.classification).toBe('asteroid-belt');
    expect(details.diskTelemetry.innerRadiusAu).toBe(2.1);
  });

  it('builds minor body entity details', () => {
    const details = buildFocusedMinorBodyDetails(
      base,
      { i: 'europa', n: 'Europa', p: [0, 0, 0], k: 3 },
      'Moon',
      'Jupiter',
      'Sol',
    );

    expect(details.focusedKind).toBe('minor-body');
    expect(details.minorBodyTelemetry.classification).toBe('moon');
    expect(details.minorBodyTelemetry.parentBodyName).toBe('Jupiter');
  });
});
