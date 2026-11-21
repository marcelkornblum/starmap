import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  parseCssColor,
  parseCssColorToHex,
  parseCssDuration,
  parseCssDurationSec,
  parseCssFloat,
  parseCssPx,
} from './cssTokenParsers';
import { getThreeColor } from './threeColorCache';

describe('cssTokenParsers', () => {
  describe('parseCssPx', () => {
    it('parses pixel values into numbers', () => {
      expect(parseCssPx('16.47px')).toBe(16.47);
      expect(parseCssPx('2px')).toBe(2);
      expect(parseCssPx('45')).toBe(45);
      expect(parseCssPx('', 10)).toBe(10);
      expect(parseCssPx('invalid', 5)).toBe(5);
    });
  });

  describe('parseCssFloat', () => {
    it('parses float scalar strings into numbers', () => {
      expect(parseCssFloat('0.35')).toBe(0.35);
      expect(parseCssFloat('1')).toBe(1);
      expect(parseCssFloat('', 0.5)).toBe(0.5);
      expect(parseCssFloat('not-a-number', 0.25)).toBe(0.25);
    });
  });

  describe('parseCssDuration & parseCssDurationSec', () => {
    it('parses milliseconds and seconds into decimal seconds', () => {
      expect(parseCssDuration('150ms')).toBeCloseTo(0.15, 4);
      expect(parseCssDuration('400ms')).toBeCloseTo(0.4, 4);
      expect(parseCssDuration('0ms')).toBe(0);
      expect(parseCssDuration('1.5s')).toBe(1.5);
      expect(parseCssDuration('invalid', 0.25)).toBe(0.25);
      expect(parseCssDuration('', 0.1)).toBe(0.1);

      expect(parseCssDurationSec('200ms')).toBeCloseTo(0.2, 4);
      expect(parseCssDurationSec('2s')).toBe(2);
      expect(parseCssDurationSec('', 0.5)).toBe(0.5);
    });
  });

  describe('parseCssColor & parseCssColorToHex', () => {
    it('parses hex colors', () => {
      const res = parseCssColor('#002b36');
      expect(res.alpha).toBe(1);
      expect(res.colorHex).toBe('#002b36');
      expect(parseCssColorToHex('#002b36')).toBe('#002b36');
    });

    it('parses rgb and rgba strings with alpha', () => {
      const resRgb = parseCssColor('rgb(255, 128, 0)');
      expect(resRgb.alpha).toBe(1);
      expect(resRgb.colorHex).toBe('#ff8000');
      expect(parseCssColorToHex('rgb(255, 128, 0)')).toBe('#ff8000');

      const resRgba = parseCssColor('rgba(100, 150, 200, 0.4)');
      expect(resRgba.alpha).toBe(0.4);
      expect(resRgba.colorHex).toBe('#6496c8');
      expect(parseCssColorToHex('rgba(100, 150, 200, 0.4)')).toBe('#6496c8');

      const resRgbaPercent = parseCssColor('rgba(100, 150, 200, 50%)');
      expect(resRgbaPercent.alpha).toBe(0.5);
      expect(resRgbaPercent.colorHex).toBe('#6496c8');
    });

    it('parses oklch color strings into colorHex and alpha', () => {
      const resOklch = parseCssColor('oklch(26.73% 0.0486 219.82 / 0.16)');
      expect(resOklch.alpha).toBe(0.16);
      expect(resOklch.colorHex).toBe('#002b36');
    });

    it('falls back gracefully on empty or invalid color strings', () => {
      const emptyRes = parseCssColor('');
      expect(emptyRes.alpha).toBe(1);
      expect(emptyRes.colorHex).toBe('#000000');
      expect(parseCssColorToHex('')).toBe('#000000');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidRes = parseCssColor('invalid-color-value-1234');
      expect(invalidRes.alpha).toBe(1);
      expect(invalidRes.colorHex).toBe('#000000');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getThreeColor', () => {
    it('converts hex string to THREE.Color with cached instance reuse', () => {
      const c1 = getThreeColor('#002b36');
      const c2 = getThreeColor('#002b36');
      expect(c1).toBeInstanceOf(THREE.Color);
      expect(c1).toBe(c2);
      expect(c1.getHexString()).toBe('002b36');
    });
  });
});
