import type React from 'react';
import type {
  OrbitalSchematicItem as OrbitalSchematicItemType,
  OrbitalSchematicSummary,
} from '../../../services/detailsService';
import {
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import {
  Badge,
  CelestialTitle,
  type CelestialSymbolType,
  Quantity,
  Unit,
  shouldDisplaySpectralBadge,
} from '../../interface/information';

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

export function OrbitalSchematicItem({
  item,
}: OrbitalSchematicItemProps): React.ReactElement {
  return (
    <li
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
        titleTestId="orbital-schematic-item-link"
      />{' '}
      {item.kind === 'star' && shouldDisplaySpectralBadge(item.summaryLabel) ? (
        <Badge category="star">
          <a
            href={buildStarTypeGuideHref(item.summaryLabel)}
            data-testid="orbital-schematic-spectral-link"
          >
            {item.summaryLabel}
          </a>
        </Badge>
      ) : item.kind === 'planet' ? (
        <Badge category="planet">
          <a
            href={buildPlanetTypeGuideHref(item.summaryLabel)}
            data-testid="orbital-schematic-planet-type-link"
          >
            {item.summaryLabel}
          </a>
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
              <Unit>
                <a
                  href={buildMetricGuideHref('semi-major-axis')}
                  data-testid="orbital-schematic-belt-unit-link"
                >
                  AU
                </a>
              </Unit>
            }
          />
        </>
      ) : null}
      {item.kind !== 'belt' && item.region === 'habitable-zone' ? (
        <>
          {' '}
          <Badge status="nominal">
            <a
              href={buildTagGalaxyHref('HabitableCandidate')}
              data-testid="orbital-schematic-habitable-link"
            >
              Habitable zone
            </a>
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
      {item.children && item.children.length > 0 ? (
        <OrbitalSchematicList items={item.children} />
      ) : null}
    </li>
  );
}

export interface OrbitalSchematicListProps {
  readonly items: readonly OrbitalSchematicItemType[];
}

export function OrbitalSchematicList({
  items,
}: OrbitalSchematicListProps): React.ReactElement {
  return (
    <ol data-testid="orbital-schematic-list">
      {items.map((item) => (
        <OrbitalSchematicItem key={item.id} item={item} />
      ))}
    </ol>
  );
}

export interface OrbitalSchematicPanelProps {
  readonly elements: OrbitalSchematicSummary | null;
}

export const OrbitalSchematicPanel: React.FC<OrbitalSchematicPanelProps> = ({
  elements,
}) => {
  if (!elements) {
    return null;
  }

  return (
    <section
      aria-labelledby="orbital-schematic-panel-heading"
      data-testid="orbital-schematic-panel"
      data-scope={elements.scope}
      data-system-id={elements.systemId}
      data-planet-id={elements.scope === 'planet' ? elements.planetId : undefined}
    >
      <h2 id="orbital-schematic-panel-heading">Orbital Schematic</h2>
      <OrbitalSchematicList items={elements.items} />
    </section>
  );
};
