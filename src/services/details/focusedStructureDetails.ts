import type { GalacticStructureRecord } from '../../types/astroStructures';
import type {
  FocusedEntityDetailsBase,
  FocusedStructureEntityDetails,
} from './detailsEntityTypes';
import type { StructureSymbolType } from './detailsTelemetryTypes';

export const resolveStructureSymbolType = (structureType?: string): StructureSymbolType => {
  if (!structureType) return 'stellar-cluster';
  const lower = structureType.toLowerCase();
  if (lower.includes('pulsar')) return 'neutron-star';
  if (lower.includes('supernova') || lower.includes('remnant')) return 'supernova-remnant';
  if (lower.includes('interstellar') || lower.includes('ism')) return 'ism';
  if (lower.includes('nebula')) return 'nebula';
  return 'stellar-cluster';
};

export function buildFocusedStructureDetails(
  baseDetails: FocusedEntityDetailsBase,
  structureRecord?: GalacticStructureRecord,
): FocusedStructureEntityDetails {
  return {
    ...baseDetails,
    focusedKind: 'structure',
    structureTelemetry: {
      structureType: structureRecord?.type ?? 'Galactic Structure',
      symbolType: resolveStructureSymbolType(structureRecord?.type),
      ...(structureRecord?.radiusPc !== undefined
        ? { radiusPc: structureRecord.radiusPc }
        : {}),
    },
  };
}
