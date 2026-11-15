import { describe, expect, it } from 'vitest';
import {
  buildSystemViewBreadcrumbs,
  buildPlanetViewBreadcrumbs,
} from './detailsBreadcrumbs';

describe('detailsBreadcrumbs', () => {
  it('constructs breadcrumbs for system view', () => {
    const breadcrumbs = buildSystemViewBreadcrumbs(null, 'tau-ceti');
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0].label).toBe('Galaxy');
    expect(breadcrumbs[0].href).toBe('/galaxy');
    expect(breadcrumbs[1].label).toBe('Tau Ceti');
  });

  it('constructs breadcrumbs for planet view', () => {
    const breadcrumbs = buildPlanetViewBreadcrumbs(null, null, 'earth');
    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs[0].label).toBe('Galaxy');
    expect(breadcrumbs[1].label).toBe('System');
    expect(breadcrumbs[2].label).toBe('Earth');
  });
});
