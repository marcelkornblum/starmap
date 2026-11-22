import React, { useMemo } from 'react';
import { useSpatialEntityStore } from '../../canvas/entity/SpatialEntityContext';
import { buildPlanetaryOrbitalSchematic } from '../../../services/details/planetaryOrbitalSchematic';
import { buildSystemOrbitalSchematic } from '../../../services/details/systemOrbitalSchematic';
import type {
  BodiesPanelSummary,
  GalaxyBodiesSummary,
  OrbitalSchematicSummary,
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
  SystemElementBodyItem,
} from '../../../services/details/detailsHierarchyTypes';
import { DataTable, Heading } from '../../interface';
import { OrbitalSchematicList } from '../OrbitalSchematicPanel/OrbitalSchematicPanel';
import { useBoundedDeferredValue } from '../../../hooks/useBoundedDeferredValue';
import { BodiesGalaxySystemRow } from './BodiesGalaxySystemRow';
import { BodiesMinorBodyRow } from './BodiesMinorBodyRow';
import styles from './BodiesPanel.module.css';

export interface BodiesPanelProps {
  readonly elements: BodiesPanelSummary | null;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly hoveredEntityId?: string | null;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

interface BodiesGalaxyViewProps {
  readonly elements: GalaxyBodiesSummary;
  readonly hoveredEntityId?: string | null;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

const BodiesGalaxyView = React.memo(function BodiesGalaxyView({
  elements,
  hoveredEntityId,
  onHoverEntity,
}: BodiesGalaxyViewProps) {
  const storeHoveredId = useSpatialEntityStore((state) => state.hoveredId);
  const activeHoveredId = hoveredEntityId !== undefined ? hoveredEntityId : storeHoveredId;
  const selectedEntityIds = elements.selectedEntityIds;
  const selectedSet = useMemo(() => new Set(selectedEntityIds ?? []), [selectedEntityIds]);
  const { centerId, apertureRadiusPc, focusedSystemId, focusedSystemName, systems } = elements;

  return (
    <section
      aria-labelledby="bodies-panel-heading"
      data-testid="bodies-panel"
      data-scope="galaxy"
      data-center-id={centerId}
      data-aperture-radius-pc={apertureRadiusPc}
      className={styles.root}
    >
      <Heading as="h2" id="bodies-panel-heading" visuallyHidden>
        Galactic Systems
      </Heading>

      {focusedSystemId && focusedSystemName ? (
        <p data-testid="bodies-distance-caption" className={styles.distanceCaption}>
          Distances from {focusedSystemName}
        </p>
      ) : null}

      <DataTable data-testid="bodies-galaxy-systems-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>System</DataTable.HeaderCell>
            <DataTable.HeaderCell>Class</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Planets</DataTable.HeaderCell>
            <DataTable.HeaderCell>Status</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Distance</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {systems.map((sys) => (
            <BodiesGalaxySystemRow
              key={sys.id}
              sys={sys}
              isItemFocused={sys.tier === 'focused'}
              isItemSelected={sys.tier === 'selected' || selectedSet.has(sys.id)}
              isItemHovered={(activeHoveredId ?? elements.hoveredEntityId) === sys.id}
              onHoverEntity={onHoverEntity}
            />
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
});

const minorBodyIdSetCache = new WeakMap<
  readonly SystemElementBodyItem[],
  ReadonlySet<string>
>();

function getMinorBodyIdSet(
  list: readonly SystemElementBodyItem[],
): ReadonlySet<string> {
  let cached = minorBodyIdSetCache.get(list);
  if (!cached) {
    cached = new Set(list.map((b) => b.id));
    minorBodyIdSetCache.set(list, cached);
  }
  return cached;
}

interface BodiesMinorBodiesSectionProps {
  readonly minorBodiesAndSpacecraft: readonly SystemElementBodyItem[];
  readonly focusedMinorBodyId: string | undefined;
  readonly selectedMinorKey: string;
}

const BodiesMinorBodiesSection = React.memo(function BodiesMinorBodiesSection({
  minorBodiesAndSpacecraft,
  focusedMinorBodyId,
  selectedMinorKey,
}: BodiesMinorBodiesSectionProps) {
  const selectedSet = useMemo(
    () => (selectedMinorKey ? new Set(selectedMinorKey.split('\0')) : null),
    [selectedMinorKey],
  );

  return (
    <section
      aria-labelledby="bodies-minor-bodies-heading"
      data-testid="bodies-minor-bodies-section"
      className={styles.section}
    >
      <Heading as="h3" size="eyebrow" id="bodies-minor-bodies-heading">
        Minor Bodies &amp; Spacecraft
      </Heading>
      <DataTable data-testid="bodies-minor-bodies-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Body</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {minorBodiesAndSpacecraft.map((body) => (
            <BodiesMinorBodyRow
              key={body.id}
              body={body}
              isFocused={focusedMinorBodyId === body.id}
              isSelected={selectedSet ? selectedSet.has(body.id) : false}
            />
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
});

interface BodiesSystemOrPlanetViewProps {
  readonly elements: SystemBodiesSummary | PlanetaryBodiesSummary;
  readonly schematic?: OrbitalSchematicSummary | null;
}

const BodiesSystemOrPlanetView = React.memo(function BodiesSystemOrPlanetView({
  elements,
  schematic,
}: BodiesSystemOrPlanetViewProps) {
  const { scope, systemId, focusedEntityId, minorBodiesAndSpacecraft, selectedEntityIds } = elements;
  const minorIdSet = useMemo(
    () => getMinorBodyIdSet(minorBodiesAndSpacecraft),
    [minorBodiesAndSpacecraft],
  );
  const focusedMinorBodyId =
    focusedEntityId && minorIdSet.has(focusedEntityId) ? focusedEntityId : undefined;
  const selectedMinorKey = useMemo(() => {
    if (!selectedEntityIds || selectedEntityIds.length === 0 || minorIdSet.size === 0) {
      return '';
    }
    return selectedEntityIds.filter((id) => minorIdSet.has(id)).join('\0');
  }, [selectedEntityIds, minorIdSet]);

  const resolvedSchematic =
    schematic ??
    (elements.scope === 'system'
      ? buildSystemOrbitalSchematic(elements)
      : buildPlanetaryOrbitalSchematic(elements));

  return (
    <section
      aria-labelledby="bodies-panel-heading"
      data-testid="bodies-panel"
      data-scope={scope}
      data-system-id={systemId}
      data-planet-id={scope === 'planet' ? elements.planetId : undefined}
      className={styles.root}
    >
      <Heading as="h2" id="bodies-panel-heading" visuallyHidden>
        {scope === 'system' ? 'System Bodies' : 'Planetary Bodies'}
      </Heading>

      <section
        aria-labelledby="bodies-schematic-heading"
        data-testid="orbital-schematic-panel"
        data-scope={scope}
        data-system-id={systemId}
        data-planet-id={scope === 'planet' ? elements.planetId : undefined}
        className={styles.section}
      >
        <Heading as="h3" id="bodies-schematic-heading" visuallyHidden>
          Orbital Schematic
        </Heading>
        {resolvedSchematic && resolvedSchematic.items.length > 0 ? (
          <OrbitalSchematicList items={resolvedSchematic.items} />
        ) : (
          <p data-testid="bodies-schematic-empty">No catalogued orbital bodies</p>
        )}
      </section>

      {minorBodiesAndSpacecraft.length > 0 ? (
        <BodiesMinorBodiesSection
          minorBodiesAndSpacecraft={minorBodiesAndSpacecraft}
          focusedMinorBodyId={focusedMinorBodyId}
          selectedMinorKey={selectedMinorKey}
        />
      ) : null}
    </section>
  );
});

const BodiesPanelInner = React.memo(function BodiesPanelInner({
  elements,
  schematic,
  hoveredEntityId,
  onHoverEntity,
}: BodiesPanelProps) {
  if (!elements) return null;

  if (elements.scope === 'galaxy') {
    return (
      <BodiesGalaxyView
        elements={elements}
        hoveredEntityId={hoveredEntityId}
        onHoverEntity={onHoverEntity}
      />
    );
  }

  return (
    <BodiesSystemOrPlanetView
      elements={elements}
      schematic={schematic}
    />
  );
});

export const BodiesPanel = React.memo(function BodiesPanel(props: BodiesPanelProps) {
  const effectiveElements = useBoundedDeferredValue(props.elements, props.elements, 900);
  return <BodiesPanelInner {...props} elements={effectiveElements} />;
});

BodiesPanel.displayName = 'BodiesPanel';
