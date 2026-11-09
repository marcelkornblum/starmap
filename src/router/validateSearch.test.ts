import { describe, it, expect } from 'vitest';
import { rootRoute, type StarmapSearchParams } from './index';

describe('AUD-022: validateSearch query param sanitization', () => {
  const validate = rootRoute.options.validateSearch as (search: Record<string, unknown>) => StarmapSearchParams;

  it('strips legacy positioning params (x, y, z, zoom, az, el, dist)', () => {
    const validated = validate({
      x: 0,
      y: 42,
      z: -15.5,
      zoom: 3,
      az: 45,
      el: -10,
      dist: 120,
    });
    const record = validated as Record<string, unknown>;
    expect(record.x).toBeUndefined();
    expect(record.y).toBeUndefined();
    expect(record.z).toBeUndefined();
    expect(record.zoom).toBeUndefined();
    expect(record.az).toBeUndefined();
    expect(record.el).toBeUndefined();
    expect(record.dist).toBeUndefined();
    expect('x' in validated).toBe(false);
    expect('y' in validated).toBe(false);
    expect('z' in validated).toBe(false);
    expect('zoom' in validated).toBe(false);
    expect('az' in validated).toBe(false);
    expect('el' in validated).toBe(false);
    expect('dist' in validated).toBe(false);
  });

  it('drops unknown query keys completely', () => {
    const validated = validate({
      center: 'sol',
      foo: 'bar',
      bar: 123,
      debug: true,
      customFilter: 'habitable',
    });

    expect(validated.center).toBe('sol');
    expect((validated as Record<string, unknown>).foo).toBeUndefined();
    expect((validated as Record<string, unknown>).bar).toBeUndefined();
    expect((validated as Record<string, unknown>).debug).toBeUndefined();
    expect((validated as Record<string, unknown>).customFilter).toBeUndefined();
    expect('foo' in validated).toBe(false);
    expect('bar' in validated).toBe(false);
    expect('debug' in validated).toBe(false);
    expect('customFilter' in validated).toBe(false);
  });

  it('sanitizes center query param (entity ID or x,y,z coordinates string per DEC-R014a)', () => {
    const validCenter = validate({ center: ' sol ' });
    expect(validCenter.center).toBe('sol');

    const coordsCenter = validate({ center: ' 12.5,42.0,-10.8 ' });
    expect(coordsCenter.center).toBe('12.5,42.0,-10.8');

    const emptyCenter = validate({ center: '   ' });
    expect(emptyCenter.center).toBeUndefined();

    const nonStringCenter = validate({ center: 123 });
    expect(nonStringCenter.center).toBeUndefined();
  });

  it('sanitizes string fields (q, searchCategory, focus, select, layer, route, journeyOption)', () => {
    const validated = validate({
      q: 'Tau Ceti',
      searchCategory: 'stars',
      focus: 'tau-ceti-e',
      select: 'layer:project-hail-mary,sol',
      layer: '  project-hail-mary  ',
      route: 'sol-to-tau-ceti',
      journeyOption: 'standard',
    });

    expect(validated.q).toBe('Tau Ceti');
    expect(validated.searchCategory).toBe('stars');
    expect(validated.focus).toBe('tau-ceti-e');
    expect(validated.select).toBe('layer:project-hail-mary,sol');
    expect(validated.layer).toBe('project-hail-mary');
    expect(validated.route).toBe('sol-to-tau-ceti');
    expect(validated.journeyOption).toBe('standard');
  });

  it('handles empty search parameters gracefully', () => {
    const validated = validate({});
    expect(validated).toEqual({});
  });
});
