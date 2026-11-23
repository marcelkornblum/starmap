import React from 'react';
import type { SystemElementBodyItem } from '../../../services/details/detailsHierarchyTypes';
import { CelestialTitle, DataTable } from '../../interface';

export interface BodiesMinorBodyRowProps {
  readonly body: SystemElementBodyItem;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
}

const areBodiesMinorBodyRowsEqual = (
  prev: BodiesMinorBodyRowProps,
  next: BodiesMinorBodyRowProps,
): boolean =>
  prev.isFocused === next.isFocused &&
  prev.isSelected === next.isSelected &&
  prev.body.id === next.body.id &&
  prev.body.name === next.body.name &&
  prev.body.href === next.body.href &&
  prev.body.categoryKey === next.body.categoryKey;

export const BodiesMinorBodyRow = React.memo(function BodiesMinorBodyRow({
  body,
  isFocused,
  isSelected,
}: BodiesMinorBodyRowProps) {
  return (
    <DataTable.Row
      data-testid="bodies-minor-body-item"
      data-body-id={body.id}
      data-focused={isFocused ? 'true' : undefined}
      data-selected={isSelected ? 'true' : undefined}
    >
      <DataTable.Cell>
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
      </DataTable.Cell>
    </DataTable.Row>
  );
}, areBodiesMinorBodyRowsEqual);

BodiesMinorBodyRow.displayName = 'BodiesMinorBodyRow';
