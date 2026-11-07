import { describe, it, expect } from 'vitest';
import {
  encodeSummaryNode,
  decodeSummaryNode,
} from './compactDataCodec';
import type { SystemSummaryNode } from '../types/astro';

describe('AUD-023: Lossless properName Round-Trip in compactDataCodec', () => {
  const baseNode: SystemSummaryNode = {
    id: 'hip-12345',
    name: 'HIP 12345',
    x: 10,
    y: 20,
    z: 30,
    dist: 37.417,
    mag: 6.5,
    absmag: 4.2,
    spect: 'G2V',
    starCount: 1,
    planetCount: 0,
    hasHabitableCandidate: false,
    sectorId: 'sector_+000_+000_+000',
    confidence: 'confirmed',
  };

  it('preserves undefined properName for non-Gaia stars', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'hip-12345',
      name: 'HIP 12345',
      properName: undefined,
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBeUndefined();
    expect(decoded.id).toBe(node.id);
    expect(decoded.name).toBe(node.name);
  });

  it('preserves properName for non-Gaia star when properName === name', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'sol',
      name: 'Sol',
      properName: 'Sol',
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBe('Sol');
    expect(decoded.name).toBe('Sol');
  });

  it('preserves properName for Gaia star when properName === name', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'gaia-123456789',
      name: 'Tau Ceti',
      properName: 'Tau Ceti',
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBe('Tau Ceti');
    expect(decoded.name).toBe('Tau Ceti');
  });

  it('preserves properName when properName !== name', () => {
    const node: SystemSummaryNode = {
      ...baseNode,
      id: 'hip-8102',
      name: 'HD 10700',
      properName: 'Tau Ceti',
    };

    const encoded = encodeSummaryNode(node);
    const decoded = decodeSummaryNode(encoded);

    expect(decoded.properName).toBe('Tau Ceti');
    expect(decoded.name).toBe('HD 10700');
  });

  it('deep-equals the summary node across round-trip', () => {
    const nodeWithoutProper: SystemSummaryNode = {
      ...baseNode,
      id: 'hip-99999',
      name: 'HIP 99999',
      properName: undefined,
    };
    const decodedWithout = decodeSummaryNode(encodeSummaryNode(nodeWithoutProper));
    expect(decodedWithout).toEqual(nodeWithoutProper);

    const nodeWithProper: SystemSummaryNode = {
      ...baseNode,
      id: 'sol',
      name: 'Sol',
      properName: 'Sol',
    };
    const decodedWith = decodeSummaryNode(encodeSummaryNode(nodeWithProper));
    expect(decodedWith).toEqual(nodeWithProper);
  });
});
