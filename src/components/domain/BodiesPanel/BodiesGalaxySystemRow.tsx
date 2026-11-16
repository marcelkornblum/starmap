import React from 'react';
import type { CelestialClassification } from '../../../types/spatial';
import type { BodiesPanelSummary } from '../../../services/details/detailsHierarchyTypes';
import {
  Badge, CelestialBadge, CelestialTitle, Cluster,
  DataTable, HazardBadge, Quantity, SpectralBadge, Unit,
} from '../../interface';

export type GalaxySystemItem = Extract<
  NonNullable<BodiesPanelSummary>,
  { scope: 'galaxy' }
>['systems'][number];

export interface BodiesGalaxySystemStaticCellsProps {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
  readonly reticleType: CelestialClassification;
  readonly spectralType?: string;
  readonly starTypeGuideHref?: string;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly habitableZoneGuideHref?: string;
  readonly hazardCount: number;
  readonly hazardSummaryLabel?: string;
  readonly hasCriticalHazard?: boolean;
}

export const BodiesGalaxySystemStaticCells = React.memo(function BodiesGalaxySystemStaticCells({
  name, href, reticleType, spectralType, starTypeGuideHref,
  planetCount, hasHabitableCandidate, habitableZoneGuideHref,
  hazardCount, hazardSummaryLabel, hasCriticalHazard,
}: BodiesGalaxySystemStaticCellsProps) {
  return (
    <>
      <DataTable.Cell>
        <CelestialTitle
          type={reticleType}
          title={name}
          href={href}
          showTooltip={false}
          titleTestId="bodies-galaxy-system-link"
          symbolTestId="bodies-galaxy-system-reticle"
        />
      </DataTable.Cell>
      <DataTable.Cell>
        {spectralType && starTypeGuideHref ? (
          <SpectralBadge
            spectralType={spectralType}
            href={starTypeGuideHref}
            data-testid="bodies-galaxy-system-spectral-link"
          />
        ) : (
          '—'
        )}
      </DataTable.Cell>
      <DataTable.Cell numeric>
        <Quantity
          data-testid="bodies-galaxy-system-planets"
          value={planetCount}
          unit={planetCount === 1 ? 'planet' : 'planets'}
        />
      </DataTable.Cell>
      <DataTable.Cell>
        <Cluster gap="tight" align="center">
          {hasHabitableCandidate && habitableZoneGuideHref ? (
            <CelestialBadge
              type="habitable-zone"
              href={habitableZoneGuideHref}
              data-testid="bodies-galaxy-system-hz-link"
            />
          ) : null}
          {hazardCount > 0 ? (
            <HazardBadge
              label={hazardSummaryLabel ?? ''}
              severity={hasCriticalHazard ? 'critical' : 'caution'}
              data-testid="bodies-galaxy-system-hazard"
            />
          ) : null}
        </Cluster>
      </DataTable.Cell>
    </>
  );
});

export interface BodiesGalaxySystemRowProps {
  readonly sys: GalaxySystemItem;
  readonly isItemFocused: boolean;
  readonly isItemSelected: boolean;
  readonly isItemHovered: boolean;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

const areBodiesGalaxySystemRowsEqual = (prev: BodiesGalaxySystemRowProps, next: BodiesGalaxySystemRowProps): boolean =>
  prev.isItemFocused === next.isItemFocused && prev.isItemSelected === next.isItemSelected &&
  prev.isItemHovered === next.isItemHovered && prev.onHoverEntity === next.onHoverEntity &&
  prev.sys.id === next.sys.id && prev.sys.name === next.sys.name && prev.sys.href === next.sys.href &&
  prev.sys.tier === next.sys.tier && prev.sys.reticleType === next.sys.reticleType &&
  prev.sys.spectralType === next.sys.spectralType && prev.sys.starTypeGuideHref === next.sys.starTypeGuideHref &&
  prev.sys.planetCount === next.sys.planetCount && prev.sys.hasHabitableCandidate === next.sys.hasHabitableCandidate &&
  prev.sys.habitableZoneGuideHref === next.sys.habitableZoneGuideHref && prev.sys.hazardCount === next.sys.hazardCount &&
  prev.sys.hasCriticalHazard === next.sys.hasCriticalHazard && prev.sys.hazardSummaryLabel === next.sys.hazardSummaryLabel &&
  prev.sys.distanceFromFocusPc === next.sys.distanceFromFocusPc && prev.sys.distanceFromFocusLy === next.sys.distanceFromFocusLy &&
  prev.sys.distanceGuideHref === next.sys.distanceGuideHref;

export const BodiesGalaxySystemRow = React.memo(function BodiesGalaxySystemRow({
  sys,
  isItemFocused,
  isItemSelected,
  isItemHovered,
  onHoverEntity,
}: BodiesGalaxySystemRowProps) {
  return (
    <DataTable.Row
      data-testid="bodies-galaxy-system-item"
      data-system-id={sys.id}
      data-tier={sys.tier}
      data-focused={isItemFocused ? 'true' : undefined}
      data-selected={isItemSelected ? 'true' : undefined}
      data-hovered={isItemHovered ? 'true' : undefined}
      selected={isItemFocused || isItemSelected}
      interactive
      onMouseEnter={() => onHoverEntity?.(sys.id)}
      onMouseLeave={() => onHoverEntity?.(null)}
      onFocus={() => onHoverEntity?.(sys.id)}
      onBlur={() => onHoverEntity?.(null)}
    >
      <BodiesGalaxySystemStaticCells
        id={sys.id}
        name={sys.name}
        href={sys.href}
        reticleType={sys.reticleType}
        spectralType={sys.spectralType}
        starTypeGuideHref={sys.starTypeGuideHref}
        planetCount={sys.planetCount}
        hasHabitableCandidate={sys.hasHabitableCandidate}
        habitableZoneGuideHref={sys.habitableZoneGuideHref}
        hazardCount={sys.hazardCount}
        hazardSummaryLabel={sys.hazardSummaryLabel}
        hasCriticalHazard={sys.hasCriticalHazard}
      />
      <DataTable.Cell numeric>
        {sys.distanceFromFocusPc !== undefined ? (
          sys.tier === 'focused' && sys.distanceFromFocusPc === 0 ? (
            <Cluster gap="tight" align="center" justify="end" data-testid="bodies-focused-origin-badge">
              <Badge status="info">Focused</Badge>
              <Quantity value={0} unit="pc" />
            </Cluster>
          ) : (
            <Cluster gap="tight" align="center" justify="end" data-testid="bodies-system-distance">
              <Quantity
                value={sys.distanceFromFocusPc}
                unit={<Unit>{sys.distanceGuideHref ? <a href={sys.distanceGuideHref} data-testid="bodies-distance-unit-link">pc</a> : 'pc'}</Unit>}
              />
              <Quantity value={sys.distanceFromFocusLy} unit="ly" />
            </Cluster>
          )
        ) : (
          '—'
        )}
      </DataTable.Cell>
    </DataTable.Row>
  );
}, areBodiesGalaxySystemRowsEqual);
