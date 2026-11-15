import type { SystemSummaryNode } from '../../types/astro';
import type {
  FocusedEntityDetailsBase,
  FocusedStarDetail,
  FocusedStarEntityDetails,
  FocusedSystemEntityDetails,
} from './detailsEntityTypes';

export function buildFocusedSystemDetails(
  baseDetails: FocusedEntityDetailsBase,
): FocusedSystemEntityDetails {
  return {
    ...baseDetails,
    focusedKind: 'system',
  };
}

export function buildFocusedStarDetails(
  baseDetails: FocusedEntityDetailsBase,
  matchedStarDetail: FocusedStarDetail | undefined,
  stars: readonly FocusedStarDetail[],
  spectralType?: string,
  summaryNode?: SystemSummaryNode,
): FocusedStarEntityDetails {
  const starSource = matchedStarDetail ?? stars[0];
  return {
    ...baseDetails,
    focusedKind: 'star',
    starTelemetry: starSource
      ? {
          componentDesignation: starSource.componentDesignation,
          spectralType: starSource.spectralType,
          mag: starSource.mag,
          absmag: starSource.absmag,
          ...(starSource.massMsun !== undefined
            ? { massMsun: starSource.massMsun }
            : {}),
          ...(starSource.radiusRsun !== undefined
            ? { radiusRsun: starSource.radiusRsun }
            : {}),
          ...(starSource.luminosityLsun !== undefined
            ? { luminosityLsun: starSource.luminosityLsun }
            : {}),
          ...(starSource.effectiveTempK !== undefined
            ? { effectiveTempK: starSource.effectiveTempK }
            : {}),
        }
      : {
          componentDesignation: 'A',
          spectralType: spectralType ?? 'G2V',
          mag: summaryNode?.mag ?? 0,
          absmag: summaryNode?.absmag ?? 0,
        },
  };
}
