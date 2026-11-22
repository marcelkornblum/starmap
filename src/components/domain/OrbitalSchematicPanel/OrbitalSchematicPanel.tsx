import React, { memo } from 'react';
import type {
  OrbitalSchematicItem as OrbitalSchematicItemType,
  OrbitalSchematicSummary,
} from '../../../services/details/detailsHierarchyTypes';
import {
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
} from '../../../content/guide';
import { buildTagGalaxyHref } from '../../../services/search/searchUrls';
import {
  Badge,
  CelestialTitle,
  type CelestialSymbolType,
  Heading,
  Quantity,
  SpectralBadge,
  Stack,
  Unit,
  shouldDisplaySpectralBadge,
} from '../../interface';
import styles from './OrbitalSchematicPanel.module.css';

const EMPTY_SCHEMATIC_ITEMS: readonly OrbitalSchematicItemType[] = [];

export interface OrbitalSchematicItemProps {
  readonly item: OrbitalSchematicItemType;
}

const resolveSchematicReticle = (kind: string): CelestialSymbolType => {
  switch (kind) {
    case 'star':
      return 'star';
    case 'belt':
      return 'belt';
    case 'debris-disk':
      return 'debris-disk';
    case 'moon':
      return 'moon';
    case 'spacecraft':
      return 'construct';
    case 'dwarf-planet':
      return 'dwarf-planet';
    case 'minor-body':
      return 'asteroid';
    case 'planet':
    default:
      return 'terrestrial';
  }
};

const areRadialSpansEqual = (
  a: readonly [number, number] | undefined,
  b: readonly [number, number] | undefined,
): boolean =>
  a === b ||
  (a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1]);

const areChildrenEqual = (
  a: readonly OrbitalSchematicItemType[] | undefined,
  b: readonly OrbitalSchematicItemType[] | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === (b?.length ?? 0);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const childA = a[i];
    const childB = b[i];
    if (!childA || !childB || !areSchematicItemsEqual(childA, childB)) {
      return false;
    }
  }
  return true;
};

const areSchematicItemsEqual = (
  a: OrbitalSchematicItemType,
  b: OrbitalSchematicItemType,
): boolean =>
  a === b ||
  (a.id === b.id &&
    a.name === b.name &&
    a.href === b.href &&
    a.kind === b.kind &&
    a.orbitRank === b.orbitRank &&
    a.summaryLabel === b.summaryLabel &&
    a.region === b.region &&
    a.inHabitableZone === b.inHabitableZone &&
    a.isFocused === b.isFocused &&
    a.isSelected === b.isSelected &&
    areRadialSpansEqual(a.radialSpanAu, b.radialSpanAu) &&
    areChildrenEqual(a.children, b.children));

const areOrbitalSchematicItemsEqual = (
  prev: OrbitalSchematicItemProps,
  next: OrbitalSchematicItemProps,
): boolean => areSchematicItemsEqual(prev.item, next.item);

export const OrbitalSchematicItem = memo(function OrbitalSchematicItem({
  item,
}: OrbitalSchematicItemProps): React.ReactElement {
  const childItems = item.children ?? EMPTY_SCHEMATIC_ITEMS;

  return (
    <li
      className={styles.item}
      data-testid="orbital-schematic-item"
      data-entity-id={item.id}
      data-kind={item.kind}
      data-orbit-rank={item.orbitRank}
      data-region={item.region}
      data-in-habitable-zone={item.inHabitableZone ? 'true' : undefined}
      data-focused={item.isFocused ? 'true' : undefined}
      data-selected={item.isSelected ? 'true' : undefined}
    >
      <CelestialTitle
        type={resolveSchematicReticle(item.kind)}
        title={item.name}
        href={item.href}
        showTooltip={false}
        titleTestId="orbital-schematic-item-link"
      />{' '}
      {item.kind === 'star' && shouldDisplaySpectralBadge(item.summaryLabel) ? (
        <SpectralBadge
          spectralType={item.summaryLabel}
          data-testid="orbital-schematic-spectral-link"
        />
      ) : item.kind === 'planet' ? (
        <Badge
          category="planet"
          href={buildPlanetTypeGuideHref(item.summaryLabel)}
          data-testid="orbital-schematic-planet-type-link"
        >
          {item.summaryLabel}
        </Badge>
      ) : item.kind === 'belt' ? (
        <Badge
          data-testid="orbital-schematic-belt-badge"
          status={
            item.summaryLabel === 'Asteroid Belt'
              ? 'caution'
              : item.summaryLabel === 'Kuiper Belt'
                ? 'info'
                : 'neutral'
          }
        >
          {item.summaryLabel}
        </Badge>
      ) : (
        <Badge status="neutral">{item.summaryLabel}</Badge>
      )}
      {item.radialSpanAu ? (
        <>
          {' '}
          <Quantity
            data-testid="orbital-schematic-belt-span"
            value={`${item.radialSpanAu[0]}–${item.radialSpanAu[1]}`}
            unit={
              <Unit
                href={buildMetricGuideHref('semi-major-axis')}
                data-testid="orbital-schematic-belt-unit-link"
              >
                AU
              </Unit>
            }
          />
        </>
      ) : null}
      {item.kind !== 'belt' && item.region === 'habitable-zone' ? (
        <>
          {' '}
          <Badge
            status="nominal"
            href={buildTagGalaxyHref('HabitableCandidate')}
            data-testid="orbital-schematic-habitable-link"
          >
            Habitable zone
          </Badge>
        </>
      ) : item.kind !== 'belt' && item.region === 'asteroid-belt' ? (
        <>
          {' '}
          <Badge status="caution">Asteroid belt</Badge>
        </>
      ) : item.kind !== 'belt' && item.region === 'kuiper-belt' ? (
        <>
          {' '}
          <Badge status="info">Kuiper belt</Badge>
        </>
      ) : null}
      {childItems.length > 0 ? (
        <OrbitalSchematicList items={childItems} />
      ) : null}
    </li>
  );
}, areOrbitalSchematicItemsEqual);

OrbitalSchematicItem.displayName = 'OrbitalSchematicItem';

export interface OrbitalSchematicListProps {
  readonly items: readonly OrbitalSchematicItemType[];
}

export const OrbitalSchematicList = memo(function OrbitalSchematicList({
  items,
}: OrbitalSchematicListProps): React.ReactElement {
  return (
    <Stack as="ol" gap="tight" data-testid="orbital-schematic-list">
      {items.map((item) => (
        <OrbitalSchematicItem key={item.id} item={item} />
      ))}
    </Stack>
  );
});

OrbitalSchematicList.displayName = 'OrbitalSchematicList';

export interface OrbitalSchematicPanelProps {
  readonly elements: OrbitalSchematicSummary | null;
}

export const OrbitalSchematicPanel = memo(function OrbitalSchematicPanel({
  elements,
}: OrbitalSchematicPanelProps): React.ReactElement | null {
  if (!elements) {
    return null;
  }

  return (
    <section
      aria-labelledby="orbital-schematic-panel-heading"
      className={styles.orbitalSchematicPanel}
      data-testid="orbital-schematic-panel"
      data-scope={elements.scope}
      data-system-id={elements.systemId}
      data-planet-id={elements.scope === 'planet' ? elements.planetId : undefined}
    >
      <Heading as="h2" id="orbital-schematic-panel-heading">
        Orbital Schematic
      </Heading>
      <OrbitalSchematicList items={elements.items} />
    </section>
  );
});

OrbitalSchematicPanel.displayName = 'OrbitalSchematicPanel';
