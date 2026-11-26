import { memo } from 'react';
import type {
  FocusedDiskDetail,
  FocusedPlanetDetail,
  FocusedStarDetail,
} from '../../../services/details/detailsEntityTypes';
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

export interface DetailsSystemHierarchyProps {
  readonly isSystemFocus: boolean;
  readonly stars?: readonly FocusedStarDetail[];
  readonly planets?: readonly FocusedPlanetDetail[];
  readonly disks?: readonly FocusedDiskDetail[];
  readonly systemNameOrId: string;
}

export const DetailsSystemHierarchy = memo(function DetailsSystemHierarchy({
  isSystemFocus,
  stars = [],
  planets = [],
  disks = [],
  systemNameOrId,
}: DetailsSystemHierarchyProps) {
  if (!isSystemFocus) {
    return null;
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
