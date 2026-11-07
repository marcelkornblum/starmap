// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DetailsPlanetTelemetrySection } from './DetailsPlanetTelemetrySection';
import type { FocusedPlanetTelemetry } from '../../../services/details/types';

describe('DetailsPlanetTelemetrySection (AUD-024 / DEC-R019)', () => {
  const baseTelemetry: FocusedPlanetTelemetry = {
    composition: 'terrestrial',
    isHabitableCandidate: false,
    semiMajorAxisAu: 1.0,
    isTheoreticalOrbit: false,
    periodDays: 365.25,
    isTidallyLocked: false,
    hazardCount: 0,
    hazards: [],
  };

  it('renders standard semi-major axis without ConfidencePip when isTheoreticalOrbit is false or absent', () => {
    render(
      <DetailsPlanetTelemetrySection
        planetTelemetry={baseTelemetry}
        entityId="earth-analog"
      />,
    );

    const axisElement = screen.getByTestId('details-planet-telemetry-axis');
    expect(axisElement.textContent).toContain('1');
    expect(screen.queryByTestId('confidence-pip-wrapper')).toBeNull();
  });

  it('renders ConfidencePip with theoretical status when isTheoreticalOrbit is true', () => {
    const theoreticalTelemetry: FocusedPlanetTelemetry = {
      ...baseTelemetry,
      semiMajorAxisAu: 0.052,
      isTheoreticalOrbit: true,
    };

    render(
      <DetailsPlanetTelemetrySection
        planetTelemetry={theoreticalTelemetry}
        entityId="theoretical-planet"
      />,
    );

    const axisElement = screen.getByTestId('details-planet-telemetry-axis');
    expect(axisElement.textContent).toContain('0.052');

    // ConfidencePip should be present within the axis datum
    const pip = within(axisElement).getByTestId('confidence-pip-wrapper');
    expect(pip).toBeDefined();
    // Verify theoretical marking via data-level or data-confidence attribute
    const isTheoretical =
      pip.getAttribute('data-level') === 'theoretical' ||
      pip.getAttribute('data-confidence') === 'theoretical';
    expect(isTheoretical).toBe(true);

    // Verify accessible trigger button label
    const trigger = within(axisElement).getByRole('button', {
      name: /theoretical confidence/i,
    });
    expect(trigger).toBeDefined();
  });
});
