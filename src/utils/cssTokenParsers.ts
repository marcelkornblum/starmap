import * as THREE from 'three';
import type { ParsedColorResult } from '../types/threeTokens';

/**
 * Converts OKLCH parameters to linear sRGB colour scalars.
 */
function oklchToLinearRgb(L: number, C: number, H: number): [number, number, number] {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = Math.max(0, Math.min(1, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s));
  const g = Math.max(0, Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s));
  const bl = Math.max(0, Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));

  return [r, g, bl];
}

/**
 * Parses any browser-computed or CSS string (hex, rgb, rgba, oklch)
 * into an immutable hex color string and an alpha scalar.
 */
export function parseCssColor(cssColorString: string): ParsedColorResult {
  const trimmed = cssColorString.trim();
  if (!trimmed) {
    return { colorHex: '#000000', alpha: 1 };
  }

  const oklchMatch = trimmed.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
  );
  if (oklchMatch) {
    const [, rawL, rawC, rawH, rawA] = oklchMatch;
    const L = rawL.endsWith('%') ? Number.parseFloat(rawL) / 100 : Number.parseFloat(rawL);
    const C = Number.parseFloat(rawC);
    const H = Number.parseFloat(rawH);
    const [r, g, b] = oklchToLinearRgb(L, C, H);
    let alpha = 1;
    if (rawA !== undefined) {
      alpha = rawA.endsWith('%') ? Number.parseFloat(rawA) / 100 : Number.parseFloat(rawA);
    }
    const color = new THREE.Color(r, g, b);
    return { colorHex: `#${color.getHexString()}`, alpha };
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i,
  );
  if (rgbaMatch) {
    const [, r, g, b, rawAlpha] = rgbaMatch;
    const hexR = Math.round(Math.max(0, Math.min(255, Number.parseFloat(r)))).toString(16).padStart(2, '0');
    const hexG = Math.round(Math.max(0, Math.min(255, Number.parseFloat(g)))).toString(16).padStart(2, '0');
    const hexB = Math.round(Math.max(0, Math.min(255, Number.parseFloat(b)))).toString(16).padStart(2, '0');
    const colorHex = `#${hexR}${hexG}${hexB}`;

    let alpha = 1;
    if (rawAlpha !== undefined) {
      alpha = rawAlpha.endsWith('%')
        ? Number.parseFloat(rawAlpha.slice(0, -1)) / 100
        : Number.parseFloat(rawAlpha);
    }
    return { colorHex, alpha };
  }

  try {
    const color = new THREE.Color(0, 0, 0);
    color.set(trimmed);
    return { colorHex: `#${color.getHexString()}`, alpha: 1 };
  } catch {
    return { colorHex: '#000000', alpha: 1 };
  }
}

/**
 * Parses CSS color string into hex color code.
 */
export function parseCssColorToHex(cssColorString: string): string {
  return parseCssColor(cssColorString).colorHex;
}

const threeColorCache = new Map<string, THREE.Color>();

/**
 * Returns a cached linear THREE.Color instance for the given hex color string.
 */
export function getThreeColor(hex: string): THREE.Color {
  const normalized = hex.toLowerCase();
  let color = threeColorCache.get(normalized);
  if (!color) {
    color = new THREE.Color(normalized);
    threeColorCache.set(normalized, color);
  }
  return color;
}

/**
 * Parses CSS duration string ('150ms', '0.2s', '0') into seconds.
 */
export function parseCssDuration(cssDuration: string, defaultSeconds = 0): number {
  const trimmed = cssDuration.trim().toLowerCase();
  if (!trimmed) return defaultSeconds;
  if (trimmed.endsWith('ms')) {
    const val = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(val) ? val / 1000 : defaultSeconds;
  }
  if (trimmed.endsWith('s')) {
    const val = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(val) ? val : defaultSeconds;
  }
  const val = Number.parseFloat(trimmed);
  return Number.isFinite(val) ? val : defaultSeconds;
}

export const parseCssDurationSec = parseCssDuration;

/**
 * Parses CSS px / numeric scalar ('6px', '16.47') into number.
 */
export function parseCssPx(cssPx: string, defaultVal = 0): number {
  const trimmed = cssPx.trim().toLowerCase();
  if (!trimmed) return defaultVal;
  if (trimmed.endsWith('px')) {
    const val = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(val) ? val : defaultVal;
  }
  const val = Number.parseFloat(trimmed);
  return Number.isFinite(val) ? val : defaultVal;
}

/**
 * Parses CSS float scalar into number.
 */
export function parseCssFloat(cssFloat: string, defaultVal = 0): number {
  const trimmed = cssFloat.trim();
  if (!trimmed) return defaultVal;
  const val = Number.parseFloat(trimmed);
  return Number.isFinite(val) ? val : defaultVal;
}
