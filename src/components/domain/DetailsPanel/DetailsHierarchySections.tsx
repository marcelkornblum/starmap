import type {
  FocusedDiskDetail,
  FocusedPlanetDetail,
  FocusedStarDetail,
  OrbitalSchematicSummary,
  SystemElementBodyItem,
} from '../../../services/detailsService';
import { Heading } from '../../interface';
import { OrbitalSchematicList } from '../OrbitalSchematicPanel/OrbitalSchematicPanel';
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

export interface DetailsPlanetHierarchyProps {
  readonly focusedKind: string;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
}

export const DetailsPlanetHierarchy = ({
  focusedKind,
  schematic,
  orbitingBodies,
}: DetailsPlanetHierarchyProps) => {
  if (
    focusedKind === 'planet' &&
    schematic &&
    schematic.scope === 'planet' &&
    schematic.items.length > 0
  ) {
    return (
      <section
        aria-labelledby="details-schematic-heading"
        data-testid="orbital-schematic-panel"
        data-scope={schematic.scope}
        data-system-id={schematic.systemId}
        data-planet-id={schematic.planetId}
      >
        <Heading as="h4" size="eyebrow" id="details-schematic-heading">
          Orbital Schematic
        </Heading>
        <OrbitalSchematicList items={schematic.items} />
      </section>
    );
  }

  return (
    <DetailsOrbitingBodiesSection
      focusedKind={focusedKind}
      orbitingBodies={orbitingBodies}
    />
  );
};

export interface DetailsSystemHierarchyProps {
  readonly isSystemFocus: boolean;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly stars?: readonly FocusedStarDetail[];
  readonly planets?: readonly FocusedPlanetDetail[];
  readonly disks?: readonly FocusedDiskDetail[];
  readonly systemNameOrId: string;
}

export const DetailsSystemHierarchy = ({
  isSystemFocus,
  schematic,
  stars = [],
  planets = [],
  disks = [],
  systemNameOrId,
}: DetailsSystemHierarchyProps) => {
  if (!isSystemFocus) {
    return null;
  }

  if (schematic && schematic.scope === 'system' && schematic.items.length > 0) {
    return (
      <section
        aria-labelledby="details-schematic-heading"
        data-testid="orbital-schematic-panel"
        data-scope={schematic.scope}
        data-system-id={schematic.systemId}
        data-planet-id={undefined}
      >
        <Heading as="h4" size="eyebrow" id="details-schematic-heading">
          Orbital Schematic
        </Heading>
        <OrbitalSchematicList items={schematic.items} />
      </section>
    );
  }

  return (
    <>
      <DetailsStarsSection stars={stars} systemNameOrId={systemNameOrId} />
      <DetailsPlanetsSection planets={planets} systemNameOrId={systemNameOrId} />
      <DetailsDisksSection disks={disks} systemNameOrId={systemNameOrId} />
    </>
  );
};
