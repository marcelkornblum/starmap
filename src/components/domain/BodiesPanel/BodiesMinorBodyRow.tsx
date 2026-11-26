import React from 'react';
import type { SystemElementBodyItem } from '../../../services/details/detailsHierarchyTypes';
import { Block, CelestialTitle } from '../../interface';

export interface BodiesMinorBodyRowProps {
  readonly body: SystemElementBodyItem;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

const areBodiesMinorBodyRowsEqual = (
  prev: BodiesMinorBodyRowProps,
  next: BodiesMinorBodyRowProps,
): boolean =>
  prev.isFocused === next.isFocused &&
  prev.isSelected === next.isSelected &&
  prev.onHoverEntity === next.onHoverEntity &&
  prev.body.id === next.body.id &&
  prev.body.name === next.body.name &&
  prev.body.href === next.body.href &&
  prev.body.categoryKey === next.body.categoryKey;

export const BodiesMinorBodyRow = React.memo(function BodiesMinorBodyRow({
  body,
  isFocused,
  isSelected,
  onHoverEntity,
}: BodiesMinorBodyRowProps) {
  return (
    <Block
      as="li"
      interactive
      selected={isFocused || isSelected}
      padding="tight"
      data-testid="bodies-minor-body-item"
      data-body-id={body.id}
      data-focused={isFocused ? 'true' : undefined}
      data-selected={isSelected ? 'true' : undefined}
      onMouseEnter={() => onHoverEntity?.(body.id)}
      onMouseLeave={() => onHoverEntity?.(null)}
      onFocus={() => onHoverEntity?.(body.id)}
      onBlur={() => onHoverEntity?.(null)}
    >
      <CelestialTitle
        type={
          body.categoryKey === 'spacecraft'
            ? 'construct'
            : (body.categoryKey ?? 'asteroid')
        }
        title={body.name}
        href={body.href}
        showTooltip={false}
        titleTestId="bodies-minor-body-link"
      />
    </Block>
  );
}, areBodiesMinorBodyRowsEqual);

BodiesMinorBodyRow.displayName = 'BodiesMinorBodyRow';
