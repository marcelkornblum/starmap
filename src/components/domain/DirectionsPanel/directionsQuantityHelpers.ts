import React, { type ReactNode } from 'react';
import type { StructuredQuantity } from '../../../services/journeyService';
import { Datum, Quantity, Unit } from '../../interface';

export function renderStructuredQuantity(
  q: StructuredQuantity | undefined | null,
  testId?: string,
): ReactNode {
  if (!q) return null;
  const unitText =
    q.secondaryValue !== undefined && q.secondaryUnit
      ? `${q.unit ? `${q.unit} ` : ''}(${q.secondaryValue} ${q.secondaryUnit})`.trim()
      : q.unit;

  return React.createElement(Quantity, {
    'data-testid': testId,
    value: q.value,
    unit: unitText ? React.createElement(Unit, null, unitText) : undefined,
  });
}

export function renderDirectionsDatum(
  label: string,
  quantityOrStr: StructuredQuantity | string | undefined | null,
  statTestId: string,
  legacyTestId?: string,
): ReactNode {
  if (!quantityOrStr) return null;
  if (typeof quantityOrStr === 'string') {
    return React.createElement(Datum, {
      label,
      value: quantityOrStr,
      valueTestId: statTestId,
      'data-testid': legacyTestId,
    });
  }
  const unitText =
    quantityOrStr.secondaryValue !== undefined && quantityOrStr.secondaryUnit
      ? `${quantityOrStr.unit ? `${quantityOrStr.unit} ` : ''}(${quantityOrStr.secondaryValue} ${quantityOrStr.secondaryUnit})`.trim()
      : quantityOrStr.unit;

  return React.createElement(Datum, {
    label,
    value: quantityOrStr.value,
    unit: unitText ? React.createElement(Unit, null, unitText) : undefined,
    valueTestId: statTestId,
    'data-testid': legacyTestId,
  });
}
