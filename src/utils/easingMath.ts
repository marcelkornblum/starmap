/**
 * Pure easing mathematical evaluators and cubic-bezier parser.
 * Extracted per DEC-GBZ-002 from useThreeTokenStore.
 */

/**
 * Creates a cubic bezier solver for the given control points (x1, y1, x2, y2).
 * Maps progress x in [0, 1] to output y in [0, 1].
 */
export function createCubicBezierSolver(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  return function solve(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const oneMinusT = 1 - t;
      const bx = 3 * oneMinusT * oneMinusT * t * x1 + 3 * oneMinusT * t * t * x2 + t * t * t;
      const diff = bx - x;
      if (Math.abs(diff) < 1e-4) break;
      const dxdt = 3 * oneMinusT * oneMinusT * x1 + 6 * oneMinusT * t * (x2 - x1) + 3 * t * t * (1 - x2);
      if (Math.abs(dxdt) < 1e-6) break;
      t -= diff / dxdt;
      t = Math.max(0, Math.min(1, t));
    }
    const oneMinusT = 1 - t;
    return 3 * oneMinusT * oneMinusT * t * y1 + 3 * oneMinusT * t * t * y2 + t * t * t;
  };
}

/**
 * Parses CSS easing string (cubic-bezier or linear) into an evaluation function.
 */
export function parseCssCubicBezier(cssEasing: string): (t: number) => number {
  const trimmed = cssEasing.trim().toLowerCase();
  if (!trimmed || trimmed === 'linear') return (t) => t;
  const match = trimmed.match(
    /^cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/,
  );
  if (match) {
    const [, x1, y1, x2, y2] = match;
    return createCubicBezierSolver(
      Number.parseFloat(x1),
      Number.parseFloat(y1),
      Number.parseFloat(x2),
      Number.parseFloat(y2),
    );
  }
  return (t) => t;
}
