/**
 * Resolves a public asset path against the application's base URL (import.meta.env.BASE_URL).
 * E.g., in production with base '/starmap/':
 *       '/data/search/core.json' -> '/starmap/data/search/core.json'
 * In development or test with base '/':
 *       '/data/search/core.json' -> '/data/search/core.json'
 */
export const resolveDataUrl = (path: string): string => {
  const base = import.meta.env?.BASE_URL ?? '/';
  return `${base}${path.replace(/^\//, '')}`;
};
