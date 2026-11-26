import { memo, useMemo } from 'react';
import type {
  FocusedDiskDetail,
  FocusedEntityKind,
  FocusedPlanetDetail,
  FocusedStarDetail,
} from '../../../services/details/detailsEntityTypes';
import type { FocusedCanonAnnotation } from '../../../services/details/detailsCanonTypes';
import type {
  OrbitalSchematicSummary,
  SystemElementBodyItem,
} from '../../../services/details/detailsHierarchyTypes';
import { useBoundedDeferredValue } from '../../../hooks/useBoundedDeferredValue';
import { OrbitalSchematicPanel } from '../OrbitalSchematicPanel';
import { DetailsCanonLayersSection } from './DetailsCanonLayersSection';
import { DetailsSystemHierarchy } from './DetailsHierarchySections';
import { DetailsOrbitingBodiesSection } from './DetailsOrbitingBodiesSection';

const hasOrbitalSchematicContent = (
  schematic?: OrbitalSchematicSummary | null,
): schematic is OrbitalSchematicSummary =>
  Boolean(schematic && (schematic.rows.length > 0 || schematic.zones.length > 0));

export interface DetailsDeferredPartialLowerProps {
  readonly canonAnnotations?: readonly FocusedCanonAnnotation[];
  readonly focusedKind: FocusedEntityKind;
  readonly isSystemFocus: boolean;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly orbitingBodies?: readonly SystemElementBodyItem[];
  readonly stars?: readonly FocusedStarDetail[];
  readonly planets?: readonly FocusedPlanetDetail[];
  readonly disks?: readonly FocusedDiskDetail[];
  readonly systemNameOrId: string;
}

const DetailsDeferredPartialLowerInner = memo(function DetailsDeferredPartialLowerInner({
  canonAnnotations = [],
  focusedKind,
  isSystemFocus,
  schematic,
  orbitingBodies,
  stars = [],
  planets = [],
  disks,
  systemNameOrId,
}: DetailsDeferredPartialLowerProps) {
  const showSchematic = hasOrbitalSchematicContent(schematic);

  return (
    <>
      {showSchematic ? (
        <OrbitalSchematicPanel elements={schematic} />
      ) : (
        <>
          <DetailsOrbitingBodiesSection
            focusedKind={focusedKind}
            orbitingBodies={orbitingBodies}
          />
          <DetailsSystemHierarchy
            isSystemFocus={isSystemFocus}
            stars={stars}
            planets={planets}
            disks={disks}
            systemNameOrId={systemNameOrId}
          />
        </>
      )}
      <DetailsCanonLayersSection canonAnnotations={canonAnnotations} />
    </>
  );
});

export const DetailsDeferredPartialLower = memo(function DetailsDeferredPartialLower(
  props: DetailsDeferredPartialLowerProps,
) {
  const bundle = useMemo(
    () => ({
      canonAnnotations: props.canonAnnotations,
      focusedKind: props.focusedKind,
      isSystemFocus: props.isSystemFocus,
      schematic: props.schematic,
      orbitingBodies: props.orbitingBodies,
      stars: props.stars,
      planets: props.planets,
      disks: props.disks,
      systemNameOrId: props.systemNameOrId,
    }),
    [
      props.canonAnnotations,
      props.focusedKind,
      props.isSystemFocus,
      props.schematic,
      props.orbitingBodies,
      props.stars,
      props.planets,
      props.disks,
      props.systemNameOrId,
    ],
  );

  const effectiveBundle = useBoundedDeferredValue(bundle, null, 900);
  if (!effectiveBundle) return null;

  return <DetailsDeferredPartialLowerInner {...effectiveBundle} />;
});
