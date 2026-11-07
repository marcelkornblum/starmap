import { describe, it, expect } from 'vitest';
import { rootRoute, type StarmapSearchParams } from './index';

describe('AUD-022: validateSearch query param sanitization', () => {
  const validate = rootRoute.options.validateSearch as (search: Record<string, unknown>) => StarmapSearchParams;

  it('parses finite numbers and numeric strings via parseFiniteNumber', () => {
    expect(validate({ x: 0 }).x).toBe(0);
    expect(validate({ x: 42 }).x).toBe(42);
    expect(validate({ x: -15.5 }).x).toBe(-15.5);
    expect(validate({ x: '0' }).x).toBe(0);
    expect(validate({ x: '  120.8  ' }).x).toBe(120.8);
    expect(validate({ x: NaN }).x).toBeUndefined();
    expect(validate({ x: Infinity }).x).toBeUndefined();
    expect(validate({ x: -Infinity }).x).toBeUndefined();
    expect(validate({ x: 'foo' }).x).toBeUndefined();
    expect(validate({ x: 'NaN' }).x).toBeUndefined();
    expect(validate({ x: 'Infinity' }).x).toBeUndefined();
    expect(validate({ x: '' }).x).toBeUndefined();
    expect(validate({ x: '   ' }).x).toBeUndefined();
    expect(validate({ x: '12px' }).x).toBeUndefined();
    expect(validate({ x: null }).x).toBeUndefined();
    expect(validate({ x: true }).x).toBeUndefined();
    expect(validate({ x: {} }).x).toBeUndefined();
  });

  it('validates finite numeric query params for x, y, z, zoom, az, el, dist', () => {
    const validated = validate({
      x: '12.5',
      y: 42,
      z: -10,
      zoom: '3',
      az: '45.5',
      el: -15,
      dist: '120.8',
    });

    expect(validated.x).toBe(12.5);
    expect(validated.y).toBe(42);
    expect(validated.z).toBe(-10);
    expect(validated.zoom).toBe(3);
    expect(validated.az).toBe(45.5);
    expect(validated.el).toBe(-15);
    expect(validated.dist).toBe(120.8);
  });

  it('rejects invalid or non-finite values (sets them to undefined or omits)', () => {
    const validated = validate({
      x: 'foo',
      y: 'NaN',
      z: 'Infinity',
      zoom: '-Infinity',
      az: NaN,
      el: Infinity,
      dist: '',
    });

    expect(validated.x).toBeUndefined();
    expect(validated.y).toBeUndefined();
    expect(validated.z).toBeUndefined();
    expect(validated.zoom).toBeUndefined();
    expect(validated.az).toBeUndefined();
    expect(validated.el).toBeUndefined();
    expect(validated.dist).toBeUndefined();
  });

  it('rejects objects, null, and empty string numeric fields', () => {
    const validated = validate({
      x: null,
      y: {},
      z: [],
    });

    expect(validated.x).toBeUndefined();
    expect(validated.y).toBeUndefined();
    expect(validated.z).toBeUndefined();
  });

  it('drops unknown query keys completely', () => {
    const validated = validate({
      x: 10,
      foo: 'bar',
      bar: 123,
      debug: true,
      customFilter: 'habitable',
    });

    expect(validated.x).toBe(10);
    expect((validated as Record<string, unknown>).foo).toBeUndefined();
    expect((validated as Record<string, unknown>).bar).toBeUndefined();
    expect((validated as Record<string, unknown>).debug).toBeUndefined();
    expect((validated as Record<string, unknown>).customFilter).toBeUndefined();
    expect('foo' in validated).toBe(false);
    expect('bar' in validated).toBe(false);
    expect('debug' in validated).toBe(false);
    expect('customFilter' in validated).toBe(false);
  });

  it('sanitizes center query param', () => {
    const validCenter = validate({ center: ' sol ' });
    expect(validCenter.center).toBe('sol');

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
      select: 'tag:habitable',
      layer: '  project-hail-mary  ',
      route: 'sol-to-tau-ceti',
      journeyOption: 'standard',
    });

    expect(validated.q).toBe('Tau Ceti');
    expect(validated.searchCategory).toBe('stars');
    expect(validated.focus).toBe('tau-ceti-e');
    expect(validated.select).toBe('tag:habitable');
    expect(validated.layer).toBe('project-hail-mary');
    expect(validated.route).toBe('sol-to-tau-ceti');
    expect(validated.journeyOption).toBe('standard');
  });

  it('handles empty search parameters gracefully', () => {
    const validated = validate({});
    expect(validated).toEqual({});
  });
});
