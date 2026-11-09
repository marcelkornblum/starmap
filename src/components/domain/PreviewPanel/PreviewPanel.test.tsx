// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from './PreviewPanel';
import type { FocusedPreviewSummary } from '../../../services/detailsService';

const mockPreview: FocusedPreviewSummary = {
  targetId: 'sol',
  targetName: 'Sol System',
  systemId: 'sol',
  systemName: 'Sol System',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  primarySemiMajorAxisAu: 1.0,
  primaryEccentricity: 0.0167,
  primaryInclinationDeg: 7.155,
  orbitElements: [
    {
      id: 'mercury',
      name: 'Mercury',
      kind: 'planet',
      orbitRank: 1,
      semiMajorAxisAu: 0.387,
      eccentricity: 0.2056,
      inclinationDeg: 7.0,
      inHabitableZone: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      orbitRank: 2,
      semiMajorAxisAu: 1.0,
      eccentricity: 0.0167,
      inclinationDeg: 0.0,
      inHabitableZone: true,
    },
  ],
};

describe('<PreviewPanel />', () => {
  it('returns null when preview is null', () => {
    const { container } = render(<PreviewPanel preview={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders target name, preview mode badge, and primary orbit telemetry', () => {
    render(<PreviewPanel preview={mockPreview} />);

    const panel = screen.getByTestId('preview-panel');
    expect(panel.getAttribute('data-target-id')).toBe('sol');
    expect(panel.getAttribute('data-preview-mode')).toBe('system-orbits');

    expect(screen.getByTestId('preview-target-name').textContent).toBe('Sol System');
    expect(screen.getByText('system-orbits')).toBeDefined();

    expect(screen.getByTestId('preview-primary-orbit-telemetry')).toBeDefined();
    expect(screen.getByTestId('preview-primary-eccentricity').textContent).toContain('0.0167');
  });

  it('renders orbit elements table with bodies and parameters', () => {
    render(<PreviewPanel preview={mockPreview} />);

    const orbitsList = screen.getByTestId('preview-orbits-list');
    expect(orbitsList).toBeDefined();

    const items = screen.getAllByTestId('preview-orbit-item');
    expect(items.length).toBe(2);
    expect(screen.getByText('Mercury')).toBeDefined();
    expect(screen.getByText('Earth')).toBeDefined();
  });

  it('renders explicit reticleType from preview', () => {
    const planetPreview: FocusedPreviewSummary = {
      ...mockPreview,
      reticleType: 'terrestrial',
    };
    const { container } = render(<PreviewPanel preview={planetPreview} />);
    expect(container.querySelector('[data-celestial-symbol="terrestrial"]')).not.toBeNull();
  });
});
