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

/**
 * Resolves an application route path against the application's base URL (import.meta.env.BASE_URL).
 * Ensures native browser navigation (middle-click, Ctrl+click, copy-link, "Open in new tab")
 * resolves cleanly under subpath deployments like GitHub Pages (`/starmap/`).
 * E.g., in production with base '/starmap/':
 *       '/galaxy?focus=sol' -> '/starmap/galaxy?focus=sol'
 * In development or test with base '/':
 *       '/galaxy?focus=sol' -> '/galaxy?focus=sol'
 */
export const resolveAppHref = (href?: string | null): string | undefined => {
  if (href === undefined || href === null) {
    return undefined;
  }
  if (!href) {
    return href;
  }
  if (
    href.startsWith('#') ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return href;
  }
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');
  if (!base || base === '/') {
    return href.startsWith('/') ? href : `/${href}`;
  }
  const cleanHref = href.startsWith('/') ? href : `/${href}`;
  if (cleanHref === base || cleanHref.startsWith(`${base}/`) || cleanHref.startsWith(`${base}?`)) {
    return cleanHref;
  }
  return `${base}${cleanHref}`;
};
