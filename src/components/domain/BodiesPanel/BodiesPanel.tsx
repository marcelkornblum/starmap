import React, { useCallback, useMemo, useState } from 'react';
import {
  useOptionalSpatialEntityStoreApi,
  useSpatialEntityStore,
} from '../../canvas/entity/SpatialEntityContext';
import type {
  BodiesPanelSummary,
  GalaxyBodiesSummary,
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
  SystemElementBodyItem,
} from '../../../services/details/detailsHierarchyTypes';
import { Block, Button, Heading, Stack } from '../../interface';
import { useBoundedDeferredValue } from '../../../hooks/useBoundedDeferredValue';
import { BodiesGalaxySystemRow } from './BodiesGalaxySystemRow';
import { BodiesMinorBodyRow } from './BodiesMinorBodyRow';
import { BodiesPrimaryRow } from './BodiesPrimaryRow';
import { buildPrimaryItems } from './bodiesPrimaryItems';
import {
  INITIAL_MINOR_BODIES_LIMIT,
  MINOR_BODIES_PAGE_STEP,
  resolveMinorBodiesWindow,
} from './minorBodiesWindow';
import styles from './BodiesPanel.module.css';

export interface BodiesPanelProps {
  readonly elements: BodiesPanelSummary | null;
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

      <Stack as="ul" gap="fib-2" data-testid="bodies-galaxy-systems-list">
        {systems.length > 0 ? (
          systems.map((sys) => (
            <BodiesGalaxySystemRow
              key={sys.id}
              sys={sys}
              isItemFocused={sys.tier === 'focused'}
              isItemSelected={sys.tier === 'selected' || selectedSet.has(sys.id)}
              isItemHovered={(activeHoveredId ?? elements.hoveredEntityId) === sys.id}
              onHoverEntity={onHoverEntity}
            />
          ))
        ) : (
          <Block as="li" padding="tight" data-testid="bodies-galaxy-systems-empty">
            Zoom in to inspect nearby systems
          </Block>
        )}
      </Stack>
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
  readonly onHoverEntity?: (entityId: string | null) => void;
}

const BodiesMinorBodiesSection = React.memo(function BodiesMinorBodiesSection({
  minorBodiesAndSpacecraft,
  focusedMinorBodyId,
  selectedMinorKey,
  onHoverEntity,
}: BodiesMinorBodiesSectionProps) {
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_MINOR_BODIES_LIMIT);
  const selectedSet = useMemo(
    () => (selectedMinorKey ? new Set(selectedMinorKey.split('\0')) : null),
    [selectedMinorKey],
  );
  const { visibleItems, remainingCount } = useMemo(
    () =>
      resolveMinorBodiesWindow(
        minorBodiesAndSpacecraft,
        visibleLimit,
        focusedMinorBodyId,
        selectedSet,
      ),
    [minorBodiesAndSpacecraft, visibleLimit, focusedMinorBodyId, selectedSet],
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
      <Stack as="ul" gap="fib-1" data-testid="bodies-minor-bodies-list">
        {visibleItems.map((body) => (
          <BodiesMinorBodyRow
            key={body.id}
            body={body}
            isFocused={focusedMinorBodyId === body.id}
            isSelected={selectedSet ? selectedSet.has(body.id) : false}
            onHoverEntity={onHoverEntity}
          />
        ))}
      </Stack>
      {remainingCount > 0 ? (
        <Button
          variant="subtle"
          size="sm"
          onClick={() => setVisibleLimit((prev) => prev + MINOR_BODIES_PAGE_STEP)}
          data-testid="bodies-minor-bodies-show-more"
        >
          {`Show ${Math.min(MINOR_BODIES_PAGE_STEP, remainingCount)} more (${remainingCount.toLocaleString()} remaining)`}
        </Button>
      ) : null}
    </section>
  );
});

interface BodiesSystemOrPlanetViewProps {
  readonly elements: SystemBodiesSummary | PlanetaryBodiesSummary;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

const BodiesSystemOrPlanetView = React.memo(function BodiesSystemOrPlanetView({
  elements,
  onHoverEntity,
}: BodiesSystemOrPlanetViewProps) {
  const storeApi = useOptionalSpatialEntityStoreApi();
  const handleHoverEntity = useCallback(
    (id: string | null) => {
      storeApi?.getState().setHovered(id);
      onHoverEntity?.(id);
    },
    [storeApi, onHoverEntity],
  );

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

  const selectedEntitySet = useMemo(
    () => new Set(selectedEntityIds ?? []),
    [selectedEntityIds],
  );
  const primaryItems = useMemo(() => buildPrimaryItems(elements), [elements]);

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

      <Stack as="ul" gap="fib-1" data-testid="bodies-primary-list">
        {primaryItems.length > 0 ? (
          primaryItems.map((item) => (
            <BodiesPrimaryRow
              key={item.id}
              item={item}
              isFocused={focusedEntityId === item.id}
              isSelected={selectedEntitySet.has(item.id)}
              onHoverEntity={handleHoverEntity}
            />
          ))
        ) : (
          <Block as="li" padding="tight" data-testid="bodies-primary-empty">
            No catalogued orbital bodies
          </Block>
        )}
      </Stack>

      {minorBodiesAndSpacecraft.length > 0 ? (
        <BodiesMinorBodiesSection
          key={`${scope}:${systemId}:${scope === 'planet' ? elements.planetId : ''}`}
          minorBodiesAndSpacecraft={minorBodiesAndSpacecraft}
          focusedMinorBodyId={focusedMinorBodyId}
          selectedMinorKey={selectedMinorKey}
          onHoverEntity={handleHoverEntity}
        />
      ) : null}
    </section>
  );
});

const BodiesPanelInner = React.memo(function BodiesPanelInner({
  elements,
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
      onHoverEntity={onHoverEntity}
    />
  );
});

export const BodiesPanel = React.memo(function BodiesPanel(props: BodiesPanelProps) {
  const effectiveElements = useBoundedDeferredValue(props.elements, props.elements, 900);
  return <BodiesPanelInner {...props} elements={effectiveElements} />;
});

BodiesPanel.displayName = 'BodiesPanel';
