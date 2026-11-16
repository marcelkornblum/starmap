import { describe, expect, it } from 'vitest';
import {
  buildFocusedSystemDetails,
  buildFocusedStarDetails,
} from './focusedStarSystemDetails';

describe('focusedStarSystemDetails', () => {
  const base: any = {
    id: 'sol',
    name: 'Sol',
    systemId: 'sol',
    systemName: 'Sol',
    stars: [
      {
        id: 'sol-star',
        name: 'Sol',
        componentDesignation: 'A',
        spectralType: 'G2V',
        mag: -26.74,
        absmag: 4.83,
      },
    ],
    planets: [],
    hazards: [],
  };

  it('builds system entity details', () => {
    const details = buildFocusedSystemDetails(base);
    expect(details.focusedKind).toBe('system');
  });

  it('builds star entity details', () => {
    const details = buildFocusedStarDetails(base, base.stars[0], base.stars);
    expect(details.focusedKind).toBe('star');
    expect(details.starTelemetry.spectralType).toBe('G2V');
    expect(details.starTelemetry.componentDesignation).toBe('A');
  });
});
