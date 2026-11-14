/**
 * Pure predicate determining whether a stellar spectral type badge should be displayed.
 * Returns false for undefined, blank strings, or placeholder 'Unknown'.
 */
export const shouldDisplaySpectralBadge = (spectralType?: string): boolean =>
  Boolean(spectralType && spectralType.trim().length > 0 && spectralType !== 'Unknown');
