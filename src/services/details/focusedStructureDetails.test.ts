import { describe, expect, it } from 'vitest';
import {
  resolveStructureSymbolType,
  buildFocusedStructureDetails,
} from './focusedStructureDetails';

describe('focusedStructureDetails', () => {
  it('resolves symbol types based on structure type string', () => {
    expect(resolveStructureSymbolType('Stellar Cluster')).toBe('stellar-cluster');
    expect(resolveStructureSymbolType('Crab Pulsar')).toBe('neutron-star');
    expect(resolveStructureSymbolType('Supernova Remnant')).toBe('supernova-remnant');
    expect(resolveStructureSymbolType('ISM Cloud')).toBe('ism');
    expect(resolveStructureSymbolType('Orion Nebula')).toBe('nebula');
    expect(resolveStructureSymbolType(undefined)).toBe('stellar-cluster');
  });

  it('builds structure entity details correctly', () => {
    const base: any = {
      id: 'm13',
      name: 'M13',
      systemId: 'm13',
      systemName: 'M13',
      stars: [],
      planets: [],
      hazards: [],
    };
    const details = buildFocusedStructureDetails(base, {
      id: 'm13',
      name: 'M13',
      type: 'GlobularCluster',
      radiusPc: 25,
      dist: 100,
      designations: [],
      description: 'Globular cluster M13',
      x: 0,
      y: 0,
      z: 0,
    });
    expect(details.focusedKind).toBe('structure');
    expect(details.structureTelemetry.structureType).toBe('GlobularCluster');
    expect(details.structureTelemetry.radiusPc).toBe(25);
  });
});
