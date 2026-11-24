import { memo, useMemo } from 'react';
import type {
  FocusedDiskDetail,
  FocusedEntityDetails,
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
import { Heading } from '../../interface';
import { OrbitalSchematicList } from '../OrbitalSchematicPanel/OrbitalSchematicPanel';
import { DetailsCanonLayersSection } from './DetailsCanonLayersSection';
import {
  DetailsPlanetHierarchy,
  DetailsSystemHierarchy,
} from './DetailsHierarchySections';
import styles from './DetailsPanel.module.css';

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
  return (
    <>
      <DetailsCanonLayersSection canonAnnotations={canonAnnotations} />
      <DetailsPlanetHierarchy
        focusedKind={focusedKind}
        schematic={schematic}
        orbitingBodies={orbitingBodies}
      />
      <DetailsSystemHierarchy
        isSystemFocus={isSystemFocus}
        schematic={schematic}
        stars={stars}
        planets={planets}
        disks={disks}
        systemNameOrId={systemNameOrId}
      />
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

export interface DetailsDeferredFullProps {
  readonly isSystemFocus: boolean;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly details?: FocusedEntityDetails;
}

const DetailsDeferredFullInner = memo(function DetailsDeferredFullInner({
  isSystemFocus,
  schematic,
}: DetailsDeferredFullProps) {
  return (
    <>
      {!isSystemFocus &&
      schematic &&
      schematic.scope === 'system' &&
      schematic.items.length > 0 ? (
        <section
          aria-labelledby="details-schematic-heading"
          data-testid="orbital-schematic-panel"
          data-scope={schematic.scope}
          data-system-id={schematic.systemId}
          className={styles.schematicSection}
        >
          <Heading as="h4" size="eyebrow" id="details-schematic-heading">
            Orbital Schematic
          </Heading>
          <OrbitalSchematicList items={schematic.items} />
        </section>
      ) : null}
    </>
  );
});

export const DetailsDeferredFull = memo(function DetailsDeferredFull(
  props: DetailsDeferredFullProps,
) {
  const bundle = useMemo(
    () => ({
      isSystemFocus: props.isSystemFocus,
      schematic: props.schematic,
      details: props.details,
    }),
    [props.isSystemFocus, props.schematic, props.details],
  );

  const effectiveBundle = useBoundedDeferredValue(bundle, null, 900);
  if (!effectiveBundle) return null;

  return <DetailsDeferredFullInner {...effectiveBundle} />;
});
