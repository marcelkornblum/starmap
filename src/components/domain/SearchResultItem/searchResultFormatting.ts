/**
 * Pure formatter producing the pluralized planet count summary for a stellar system result.
 */
export const formatPlanetCountSummary = (planetCount?: number): string | null => {
  if (planetCount === undefined || planetCount <= 0) {
    return null;
  }
  return `${planetCount} ${planetCount === 1 ? 'planet' : 'planets'}`;
};
