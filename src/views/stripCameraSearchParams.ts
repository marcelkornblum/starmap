const CAMERA_SEARCH_PARAMS = ['center', 'x', 'y', 'z', 'az', 'el', 'dist', 'zoom'] as const;

/**
 * Removes transient camera pose query parameters from a location search string
 * while preserving search/focus/layer/route parameters.
 */
export function stripCameraSearchParams(search: string): string {
  if (!search) {
    return search;
  }
  const params = new URLSearchParams(search);
  let modified = false;
  for (const key of CAMERA_SEARCH_PARAMS) {
    if (params.has(key)) {
      params.delete(key);
      modified = true;
    }
  }
  if (!modified) {
    return search;
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
