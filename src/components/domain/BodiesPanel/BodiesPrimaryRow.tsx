import React from 'react';
import {
  Block,
  CelestialBadge,
  CelestialTitle,
  type CelestialSymbolType,
  Cluster,
  SpectralBadge,
  shouldDisplaySpectralBadge,
} from '../../interface';
import type { BodiesPrimaryItem } from './bodiesPrimaryItems';

export interface BodiesPrimaryRowProps {
  readonly item: BodiesPrimaryItem;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

function resolvePrimarySymbolType(item: BodiesPrimaryItem): CelestialSymbolType {
  switch (item.kind) {
    case 'star':
      return 'star';
    case 'planet':
    case 'host-planet':
      return item.composition;
    case 'disk':
      return item.symbolType;
    case 'dwarf-planet':
      return 'dwarf-planet';
    case 'moon':
      return 'moon';
  }
}

function renderTrailingBadges(item: BodiesPrimaryItem): React.ReactNode {
  switch (item.kind) {
    case 'star':
      return shouldDisplaySpectralBadge(item.spectralType) ? (
        <SpectralBadge spectralType={item.spectralType} />
      ) : null;
    case 'planet':
      return (
        <Cluster gap="tight" align="center">
          <CelestialBadge type={item.composition} interactive />
          {item.isHabitableCandidate ? (
            <CelestialBadge type="habitable-zone" interactive />
          ) : null}
        </Cluster>
      );
    case 'disk':
      return <CelestialBadge type={item.symbolType} interactive />;
    case 'dwarf-planet':
      return <CelestialBadge type="dwarf-planet" interactive />;
    case 'host-planet':
      return null;
    case 'moon':
      return <CelestialBadge type="moon" />;
  }
}

const areBodiesPrimaryItemsEqual = (
  a: BodiesPrimaryItem,
  b: BodiesPrimaryItem,
): boolean => {
  if (a === b) return true;
  if (a.kind !== b.kind || a.id !== b.id || a.name !== b.name || a.href !== b.href) {
    return false;
  }
  switch (a.kind) {
    case 'star':
      return b.kind === 'star' && a.spectralType === b.spectralType;
    case 'planet':
      return (
        b.kind === 'planet' &&
        a.composition === b.composition &&
        a.isHabitableCandidate === b.isHabitableCandidate
      );
    case 'disk':
      return (
        b.kind === 'disk' &&
        a.symbolType === b.symbolType &&
        a.kindLabel === b.kindLabel
      );
    case 'dwarf-planet':
      return b.kind === 'dwarf-planet';
    case 'host-planet':
      return b.kind === 'host-planet' && a.composition === b.composition;
    case 'moon':
      return b.kind === 'moon' && a.categoryLabel === b.categoryLabel;
  }
};

const areBodiesPrimaryRowsEqual = (
  prev: BodiesPrimaryRowProps,
  next: BodiesPrimaryRowProps,
): boolean =>
  prev.isFocused === next.isFocused &&
  prev.isSelected === next.isSelected &&
  prev.onHoverEntity === next.onHoverEntity &&
  areBodiesPrimaryItemsEqual(prev.item, next.item);

export const BodiesPrimaryRow = React.memo(function BodiesPrimaryRow({
  item,
  isFocused,
  isSelected,
  onHoverEntity,
}: BodiesPrimaryRowProps) {
  return (
    <Block
      as="li"
      interactive
      selected={isFocused || isSelected}
      padding="tight"
      data-testid="bodies-primary-item"
      data-entity-id={item.id}
      data-focused={isFocused ? 'true' : undefined}
      data-selected={isSelected ? 'true' : undefined}
      onMouseEnter={() => onHoverEntity?.(item.id)}
      onMouseLeave={() => onHoverEntity?.(null)}
      onFocus={() => onHoverEntity?.(item.id)}
      onBlur={() => onHoverEntity?.(null)}
    >
      <Cluster justify="between" align="center" gap="tight">
        <CelestialTitle
          type={resolvePrimarySymbolType(item)}
          title={item.name}
          href={item.href}
          showTooltip={false}
          titleTestId="bodies-item-link"
        />
        {renderTrailingBadges(item)}
      </Cluster>
    </Block>
  );
}, areBodiesPrimaryRowsEqual);

BodiesPrimaryRow.displayName = 'BodiesPrimaryRow';
