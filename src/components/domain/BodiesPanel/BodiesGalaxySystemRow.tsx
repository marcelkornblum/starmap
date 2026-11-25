import React from 'react';
import type { BodiesPanelSummary } from '../../../services/details/detailsHierarchyTypes';
import {
  Badge,
  Block,
  CelestialBadge,
  CelestialTitle,
  Cluster,
  HazardBadge,
  Quantity,
  SpectralBadge,
  Stack,
  Unit,
} from '../../interface';

export type GalaxySystemItem = Extract<
  NonNullable<BodiesPanelSummary>,
  { scope: 'galaxy' }
>['systems'][number];

export interface BodiesGalaxySystemRowProps {
  readonly sys: GalaxySystemItem;
  readonly isItemFocused: boolean;
  readonly isItemSelected: boolean;
  readonly isItemHovered: boolean;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

const areBodiesGalaxySystemRowsEqual = (
  prev: BodiesGalaxySystemRowProps,
  next: BodiesGalaxySystemRowProps,
): boolean =>
  prev.isItemFocused === next.isItemFocused &&
  prev.isItemSelected === next.isItemSelected &&
  prev.isItemHovered === next.isItemHovered &&
  prev.onHoverEntity === next.onHoverEntity &&
  prev.sys.id === next.sys.id &&
  prev.sys.name === next.sys.name &&
  prev.sys.href === next.sys.href &&
  prev.sys.tier === next.sys.tier &&
  prev.sys.reticleType === next.sys.reticleType &&
  prev.sys.spectralType === next.sys.spectralType &&
  prev.sys.starTypeGuideHref === next.sys.starTypeGuideHref &&
  prev.sys.planetCount === next.sys.planetCount &&
  prev.sys.hasHabitableCandidate === next.sys.hasHabitableCandidate &&
  prev.sys.habitableZoneGuideHref === next.sys.habitableZoneGuideHref &&
  prev.sys.hazardCount === next.sys.hazardCount &&
  prev.sys.hasCriticalHazard === next.sys.hasCriticalHazard &&
  prev.sys.hazardSummaryLabel === next.sys.hazardSummaryLabel &&
  prev.sys.distanceFromFocusPc === next.sys.distanceFromFocusPc &&
  prev.sys.distanceFromFocusLy === next.sys.distanceFromFocusLy &&
  prev.sys.distanceGuideHref === next.sys.distanceGuideHref;

export const BodiesGalaxySystemRow = React.memo(function BodiesGalaxySystemRow({
  sys,
  isItemFocused,
  isItemSelected,
  isItemHovered,
  onHoverEntity,
}: BodiesGalaxySystemRowProps) {
  return (
    <Block
      as="li"
      interactive
      selected={isItemFocused || isItemSelected}
      padding="tight"
      data-testid="bodies-galaxy-system-item"
      data-system-id={sys.id}
      data-tier={sys.tier}
      data-focused={isItemFocused ? 'true' : undefined}
      data-selected={isItemSelected ? 'true' : undefined}
      data-hovered={isItemHovered ? 'true' : undefined}
      onMouseEnter={() => onHoverEntity?.(sys.id)}
      onMouseLeave={() => onHoverEntity?.(null)}
      onFocus={() => onHoverEntity?.(sys.id)}
      onBlur={() => onHoverEntity?.(null)}
    >
      <Stack gap="fib-1">
        <Cluster justify="between" align="center" gap="tight">
          <CelestialTitle
            type={sys.reticleType}
            title={sys.name}
            href={sys.href}
            showTooltip={false}
            titleTestId="bodies-galaxy-system-link"
            symbolTestId="bodies-galaxy-system-reticle"
          />
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
                  unit={
                    <Unit>
                      {sys.distanceGuideHref ? (
                        <a href={sys.distanceGuideHref} data-testid="bodies-distance-unit-link">
                          pc
                        </a>
                      ) : (
                        'pc'
                      )}
                    </Unit>
                  }
                />
                <Quantity value={sys.distanceFromFocusLy} unit="ly" />
              </Cluster>
            )
          ) : null}
        </Cluster>
        <Cluster gap="tight" align="center">
          {sys.spectralType && sys.starTypeGuideHref ? (
            <SpectralBadge
              spectralType={sys.spectralType}
              href={sys.starTypeGuideHref}
              data-testid="bodies-galaxy-system-spectral-link"
            />
          ) : null}
          <Quantity
            data-testid="bodies-galaxy-system-planets"
            value={sys.planetCount}
            unit={sys.planetCount === 1 ? 'planet' : 'planets'}
          />
          {sys.hasHabitableCandidate && sys.habitableZoneGuideHref ? (
            <CelestialBadge
              type="habitable-zone"
              href={sys.habitableZoneGuideHref}
              data-testid="bodies-galaxy-system-hz-link"
            />
          ) : null}
          {sys.hazardCount > 0 ? (
            <HazardBadge
              label={sys.hazardSummaryLabel ?? ''}
              severity={sys.hasCriticalHazard ? 'critical' : 'caution'}
              data-testid="bodies-galaxy-system-hazard"
            />
          ) : null}
        </Cluster>
      </Stack>
    </Block>
  );
}, areBodiesGalaxySystemRowsEqual);
