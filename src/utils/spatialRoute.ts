/**
 * Returns `true` when `pathname` corresponds to a spatial 3D route
 * (`/`, `/galaxy`, `/galaxy/...`, `/system/...`, `/planet/...`), ignoring
 * trailing slashes, query strings, and hash fragments.
 */
export function isSpatialRoutePathname(pathname: string): boolean {
  const withoutQueryOrHash = (pathname.split('?')[0] ?? '').split('#')[0] ?? '';
  if (!withoutQueryOrHash) return false;
  const normalised = withoutQueryOrHash.replace(/\/+$/, '') || '/';
  return (
    normalised === '/' ||
    normalised === '/galaxy' ||
    normalised.startsWith('/galaxy/') ||
    normalised.startsWith('/system/') ||
    normalised.startsWith('/planet/')
  );
}
