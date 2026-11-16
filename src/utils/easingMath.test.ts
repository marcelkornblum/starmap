import { describe, it, expect } from 'vitest';
import { createCubicBezierSolver, parseCssCubicBezier } from './easingMath';

describe('easingMath', () => {
  describe('createCubicBezierSolver', () => {
    it('returns boundary values for t <= 0 and t >= 1', () => {
      const solver = createCubicBezierSolver(0.25, 0.1, 0.25, 1.0);
      expect(solver(-0.5)).toBe(0);
      expect(solver(0)).toBe(0);
      expect(solver(1)).toBe(1);
      expect(solver(1.5)).toBe(1);
    });

    it('solves cubic bezier smoothly for intermediate values', () => {
      const solver = createCubicBezierSolver(0.2, 0, 0, 1);
      const val = solver(0.5);
      expect(val).toBeGreaterThan(0.7);
      expect(val).toBeLessThan(1.0);
    });

    it('handles linear curve control points (0, 0, 1, 1)', () => {
      const solver = createCubicBezierSolver(0, 0, 1, 1);
      expect(solver(0.25)).toBeCloseTo(0.25, 2);
      expect(solver(0.5)).toBeCloseTo(0.5, 2);
      expect(solver(0.75)).toBeCloseTo(0.75, 2);
    });
  });

  describe('parseCssCubicBezier', () => {
    it('returns identity function for empty string, linear, or whitespace', () => {
      const linear = parseCssCubicBezier('linear');
      expect(linear(0)).toBe(0);
      expect(linear(0.5)).toBe(0.5);
      expect(linear(1)).toBe(1);

      const empty = parseCssCubicBezier('');
      expect(empty(0.42)).toBe(0.42);

      const whitespace = parseCssCubicBezier('   ');
      expect(whitespace(0.42)).toBe(0.42);
    });

    it('parses valid cubic-bezier notation and solves progress', () => {
      const snappy = parseCssCubicBezier('cubic-bezier(0.2, 0, 0, 1)');
      expect(snappy(0)).toBe(0);
      expect(snappy(1)).toBe(1);
      expect(snappy(0.5)).toBeGreaterThan(0.7);
    });

    it('handles cubic-bezier with negative values or decimals', () => {
      const easeInOut = parseCssCubicBezier('cubic-bezier(0.42, 0, 0.58, 1)');
      expect(easeInOut(0)).toBe(0);
      expect(easeInOut(1)).toBe(1);
      expect(easeInOut(0.5)).toBeCloseTo(0.5, 1);
    });

    it('falls back to identity function for invalid CSS easing strings', () => {
      const invalid = parseCssCubicBezier('not-a-curve');
      expect(invalid(0.5)).toBe(0.5);

      const malformed = parseCssCubicBezier('cubic-bezier(1, 2)');
      expect(malformed(0.5)).toBe(0.5);
    });
  });
});
