import { describe, it, expect } from 'vitest';
import {
  createGalacticPlanarGridGeometry,
  createCircularPlanarGridGeometry,
} from './cartographyPolarGrid';

describe('cartographyPolarGrid', () => {
  it('creates galactic planar grid geometry within bounded extent', () => {
    const geom = createGalacticPlanarGridGeometry(500, 100, 1000, 32, true);
    expect(geom.getAttribute('position').count).toBeGreaterThan(0);
    geom.dispose();
  });

  it('creates circular planar grid geometry within radius bound', () => {
    const geom = createCircularPlanarGridGeometry(10, 2.5, 50, 32, true);
    expect(geom.getAttribute('position').count).toBeGreaterThan(0);
    geom.dispose();
  });
});
