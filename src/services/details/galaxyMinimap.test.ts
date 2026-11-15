import { describe, expect, it } from 'vitest';
import { buildGalaxyMinimapOrientation } from './galaxyMinimap';

describe('galaxyMinimap', () => {
  it('builds galaxy minimap orientation summary with anchor and coordinates', () => {
    const orientation = buildGalaxyMinimapOrientation(
      {
        id: 'sol',
        name: 'Sol',
        position: [0, 0, 0],
        classification: 'stellar-system',
      },
      [],
    );
    expect(orientation.scope).toBe('galaxy');
    expect(orientation.anchorId).toBe('sol');
    expect(orientation.coordinatesPc).toEqual([0, 0, 0]);
  });
});
