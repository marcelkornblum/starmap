import { memo } from 'react';
import type {
  FocusedDiskDetail,
  FocusedPlanetDetail,
  FocusedStarDetail,
} from '../../../services/details/detailsEntityTypes';
import type {
  OrbitalSchematicSummary,
  SystemElementBodyItem,
} from '../../../services/details/detailsHierarchyTypes';
import { OrbitalSchematicPanel } from '../OrbitalSchematicPanel';
import { DetailsDisksSection } from './DetailsDisksSection';
import { DetailsOrbitingBodiesSection } from './DetailsOrbitingBodiesSection';
import { DetailsPlanetsSection } from './DetailsPlanetsSection';
import { DetailsStarsSection } from './DetailsStarsSection';

export {
  DetailsDisksSection,
  DetailsOrbitingBodiesSection,
  DetailsPlanetsSection,
  DetailsStarsSection,
};

const hasOrbitalSchematicContent = (
  schematic?: OrbitalSchematicSummary | null,
): schematic is OrbitalSchematicSummary =>
  Boolean(schematic && (schematic.rows.length > 0 || schematic.zones.length > 0));

export interface DetailsPlanetHierarchyProps {
  readonly focusedKind: string;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
}

export const DetailsPlanetHierarchy = memo(function DetailsPlanetHierarchy({
  focusedKind,
  schematic,
  orbitingBodies,
}: DetailsPlanetHierarchyProps) {
  if (
    focusedKind !== 'system' &&
    focusedKind !== 'star' &&
    hasOrbitalSchematicContent(schematic)
  ) {
    return <OrbitalSchematicPanel elements={schematic} />;
  }

  return (
    <DetailsOrbitingBodiesSection
      focusedKind={focusedKind}
      orbitingBodies={orbitingBodies}
    />
  );
});

DetailsPlanetHierarchy.displayName = 'DetailsPlanetHierarchy';

export interface DetailsSystemHierarchyProps {
  readonly isSystemFocus: boolean;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly stars?: readonly FocusedStarDetail[];
  readonly planets?: readonly FocusedPlanetDetail[];
  readonly disks?: readonly FocusedDiskDetail[];
  readonly systemNameOrId: string;
}

export const DetailsSystemHierarchy = memo(function DetailsSystemHierarchy({
  isSystemFocus,
  schematic,
  stars = [],
  planets = [],
  disks = [],
  systemNameOrId,
}: DetailsSystemHierarchyProps) {
  if (!isSystemFocus) {
    return null;
  }

  if (hasOrbitalSchematicContent(schematic)) {
    return <OrbitalSchematicPanel elements={schematic} />;
  }

  return (
    <>
      <DetailsStarsSection stars={stars} systemNameOrId={systemNameOrId} />
      <DetailsPlanetsSection planets={planets} systemNameOrId={systemNameOrId} />
      <DetailsDisksSection disks={disks} systemNameOrId={systemNameOrId} />
    </>
  );
});

DetailsSystemHierarchy.displayName = 'DetailsSystemHierarchy';
