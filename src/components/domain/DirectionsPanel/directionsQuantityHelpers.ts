import React, { type ReactNode } from 'react';
import type {
  JourneyOptionElevationOrRange,
  JourneySecondaryGeometry,
  StructuredQuantity,
} from '../../../services/journeyService';
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

export function renderSecondaryGeometry(
  geom: JourneySecondaryGeometry | undefined | null,
  testId?: string,
): ReactNode {
  if (!geom) return null;
  if (geom.kind === 'elevation') {
    const signedVal =
      typeof geom.deltaZ.value === 'number' && geom.deltaZ.value > 0
        ? `+${geom.deltaZ.value}`
        : geom.deltaZ.value;
    const signedSec =
      typeof geom.deltaZ.secondaryValue === 'number' && geom.deltaZ.secondaryValue > 0
        ? `+${geom.deltaZ.secondaryValue}`
        : geom.deltaZ.secondaryValue;
    const unitText =
      geom.deltaZ.secondaryValue !== undefined && geom.deltaZ.secondaryUnit
        ? `${geom.deltaZ.unit} (${signedSec} ${geom.deltaZ.secondaryUnit})`
        : geom.deltaZ.unit;

    return React.createElement(Quantity, {
      'data-testid': testId,
      value: `Δz ${signedVal}`,
      unit: unitText ? React.createElement(Unit, null, unitText) : undefined,
    });
  }

  const rangeVal = `${geom.min.value}–${geom.max.value}`;
  const secRange =
    geom.min.secondaryValue !== undefined && geom.max.secondaryValue !== undefined
      ? ` (${geom.min.secondaryValue}–${geom.max.secondaryValue} ${geom.min.secondaryUnit ?? ''})`.trimEnd()
      : '';
  const unitText = `${geom.min.unit}${secRange}`;

  return React.createElement(Quantity, {
    'data-testid': testId,
    value: rangeVal,
    unit: React.createElement(Unit, null, unitText),
  });
}

export function renderDirectionsDatum(
  label: string,
  quantityOrStr:
    | StructuredQuantity
    | JourneySecondaryGeometry
    | JourneyOptionElevationOrRange
    | string
    | undefined
    | null,
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

  if ('kind' in quantityOrStr) {
    if (quantityOrStr.kind === 'elevation') {
      const signedVal =
        typeof quantityOrStr.deltaZ.value === 'number' && quantityOrStr.deltaZ.value > 0
          ? `+${quantityOrStr.deltaZ.value}`
          : quantityOrStr.deltaZ.value;
      const signedSec =
        typeof quantityOrStr.deltaZ.secondaryValue === 'number' && quantityOrStr.deltaZ.secondaryValue > 0
          ? `+${quantityOrStr.deltaZ.secondaryValue}`
          : quantityOrStr.deltaZ.secondaryValue;
      const unitText =
        quantityOrStr.deltaZ.secondaryValue !== undefined && quantityOrStr.deltaZ.secondaryUnit
          ? `${quantityOrStr.deltaZ.unit} (${signedSec} ${quantityOrStr.deltaZ.secondaryUnit})`
          : quantityOrStr.deltaZ.unit;

      return React.createElement(Datum, {
        label,
        value: `Δz ${signedVal}`,
        unit: unitText ? React.createElement(Unit, null, unitText) : undefined,
        valueTestId: statTestId,
        'data-testid': legacyTestId,
      });
    }

    if (quantityOrStr.kind === 'orbital-range') {
      const rangeVal = `${quantityOrStr.min.value}–${quantityOrStr.max.value}`;
      const secRange =
        quantityOrStr.min.secondaryValue !== undefined && quantityOrStr.max.secondaryValue !== undefined
          ? ` (${quantityOrStr.min.secondaryValue}–${quantityOrStr.max.secondaryValue} ${quantityOrStr.min.secondaryUnit ?? ''})`.trimEnd()
          : '';
      const unitText = `${quantityOrStr.min.unit}${secRange}`;

      return React.createElement(Datum, {
        label,
        value: rangeVal,
        unit: React.createElement(Unit, null, unitText),
        valueTestId: statTestId,
        'data-testid': legacyTestId,
      });
    }

    if (quantityOrStr.kind === 'single-leg') {
      return renderDirectionsDatum(label, quantityOrStr.geometry, statTestId, legacyTestId);
    }

    const legLabel = `${quantityOrStr.legCount} legs`;
    return React.createElement(Datum, {
      label,
      value: legLabel,
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
