import { describe, it, expect } from 'vitest';
import {
  buildJourneyChordRenderData,
  type JourneyChordLeg,
} from './journeyChordGeometry';

describe('journeyChordGeometry', () => {
  const mockLeg: JourneyChordLeg = {
    id: 'sol-tau-ceti',
    stepIndex: 0,
    fromId: 'sol',
    fromName: 'Sol',
    fromPosition: [0, 0, 0],
    toId: 'tau-ceti',
    toName: 'Tau Ceti',
    toPosition: [-2.61, 1.83, -1.72],
    distanceLabel: '11.90 ly',
    secondaryLabel: '1g Relativistic',
    methodId: 'torchship-1g',
  };

  it('builds render data with flat line positions, elevation projections, and waypoints', () => {
    const renderData = buildJourneyChordRenderData([mockLeg]);
    expect(renderData.legs).toHaveLength(1);
    const legGeom = renderData.legs[0];
    expect(legGeom.positions.length).toBe(6);
    expect(legGeom.elevationProjectionSegments?.length).toBeGreaterThanOrEqual(12);
    expect(renderData.waypoints).toHaveLength(2);
    expect(renderData.waypoints[0].name).toBe('Sol');
    expect(renderData.waypoints[1].name).toBe('Tau Ceti');
    expect(legGeom.distanceLabel).toContain('11.90 ly');
  });
});
