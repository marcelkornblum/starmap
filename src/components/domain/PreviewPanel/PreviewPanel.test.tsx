import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CanvasRouterBridgeContext, type AppRouterAdapter } from '../../../hooks/useSpaLocation';
import { useCameraStore } from '../../../stores/useCameraStore';
import type { FocusedPreviewSummary } from '../../../services/details/detailsNavigationTypes';
import { buildPreviewProjection } from './previewPanelHelpers';
import { PreviewPanel } from './PreviewPanel';

const solSystemPreview: FocusedPreviewSummary = {
  targetId: 'sol',
  targetName: 'Sol System',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  detailsHref: '/system/sol',
  reticleType: 'stellar-system',
  primaryInclinationDeg: 60.19,
  orbitElements: [
    {
      id: 'mercury',
      name: 'Mercury',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 1,
      semiMajorAxisAu: 0.387,
      inHabitableZone: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 2,
      semiMajorAxisAu: 1.0,
      inHabitableZone: true,
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      kind: 'planet',
      symbolType: 'gas-giant',
      orbitRank: 3,
      semiMajorAxisAu: 5.204,
      inHabitableZone: false,
    },
    {
      id: 'uranus',
      name: 'Uranus',
      kind: 'planet',
      symbolType: 'ice-giant',
      orbitRank: 4,
      semiMajorAxisAu: 19.218,
      inHabitableZone: false,
    },
  ],
};

const earthPreview: FocusedPreviewSummary = {
  targetId: 'earth',
  targetName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'planet',
  previewMode: 'planetary-system',
  detailsHref: '/planet/earth',
  reticleType: 'terrestrial',
  primaryInclinationDeg: 23.44,
  orbitElements: [
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      symbolType: 'moon',
      orbitRank: 1,
      inHabitableZone: false,
    },
    {
      id: 'iss',
      name: 'ISS',
      kind: 'spacecraft',
      symbolType: 'spacecraft',
      orbitRank: 2,
      inHabitableZone: false,
    },
  ],
};

const tauCetiUnmeasuredPreview: FocusedPreviewSummary = {
  targetId: 'tau-ceti',
  targetName: 'Tau Ceti',
  systemId: 'tau-ceti',
  systemName: 'Tau Ceti',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  detailsHref: '/system/tau-ceti',
  reticleType: 'stellar-system',
  primaryInclinationDeg: 0,
  orbitElements: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 1,
      semiMajorAxisAu: 0.538,
      inHabitableZone: true,
    },
  ],
};

const uranusPreview: FocusedPreviewSummary = {
  targetId: 'uranus',
  targetName: 'Uranus',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'planet',
  previewMode: 'planetary-system',
  detailsHref: '/planet/uranus',
  reticleType: 'ice-giant',
  primaryInclinationDeg: 97.77,
  orbitElements: [
    {
      id: 'titania',
      name: 'Titania',
      kind: 'moon',
      symbolType: 'moon',
      orbitRank: 1,
      inHabitableZone: false,
    },
  ],
};

const noLinkObjectPreview: FocusedPreviewSummary = {
  targetId: 'orion-nebula',
  targetName: 'Orion Nebula',
  systemId: 'orion-nebula',
  systemName: 'Orion Nebula',
  focusedKind: 'structure',
  previewMode: 'object-orbit',
  primaryInclinationDeg: 0,
  orbitElements: [],
};

describe('<PreviewPanel />', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
  });

  it('returns null when preview is null', () => {
    const { container } = render(<PreviewPanel preview={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders fixed-outer-view SVG with outer reference ring, tilted target plane, 2 concentric rings, primary reticle, and child CelestialSymbol reticles', () => {
    render(<PreviewPanel preview={solSystemPreview} />);

    const panel = screen.getByTestId('preview-panel');
    expect(panel).toHaveAttribute('data-target-id', 'sol');
    expect(panel).toHaveAttribute('data-focused-kind', 'system');
    expect(panel).toHaveAttribute('data-preview-mode', 'system-orbits');
    expect(panel).toHaveAttribute('data-camera-mode', 'fixed');

    const slot = screen.getByTestId('preview-canvas-slot');
    const svg = slot.querySelector('svg[viewBox="0 0 260 156"]');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Sol System orientation preview');

    const polygons = svg?.querySelectorAll('polygon') ?? [];
    // 1 outer reference ring + 1 tilted target plane + 2 concentric rings
    expect(polygons).toHaveLength(4);
    expect(polygons[0]).toHaveAttribute('stroke-dasharray', '3 3');
    expect(polygons[1]).toHaveAttribute('data-testid', 'preview-target-plane-front');

    const primaryReticle = screen.getByTestId('preview-primary-reticle');
    const primarySvg = primaryReticle.querySelector('svg[data-celestial-symbol="stellar-system"]');
    expect(primarySvg).not.toBeNull();
    expect(primarySvg).toHaveAttribute('data-status', 'neutral');
    expect(primarySvg).not.toHaveAttribute('data-category');

    const heading = screen.getByRole('heading', { name: 'Focus Preview' });
    expect(heading.id).toBeTruthy();
    expect(heading.id).not.toBe('preview-panel-heading');
    expect(panel).toHaveAttribute('aria-labelledby', heading.id);

    const bodyDots = screen.getAllByTestId('preview-body-dot');
    expect(bodyDots).toHaveLength(4);
    const symbolTypes = bodyDots.map((node) => node.getAttribute('data-symbol-type')).sort();
    expect(symbolTypes).toEqual(['gas-giant', 'ice-giant', 'terrestrial', 'terrestrial']);

    const earthSvg = svg?.querySelector(
      'g[data-symbol-type="terrestrial"] svg[data-status="nominal"]',
    );
    expect(earthSvg).not.toBeNull();
  });

  it('renders moon and spacecraft child CelestialSymbol reticles in planetary-system mode', () => {
    render(<PreviewPanel preview={earthPreview} />);

    const primaryReticle = screen.getByTestId('preview-primary-reticle');
    const primarySvg = primaryReticle.querySelector('svg[data-celestial-symbol="terrestrial"]');
    expect(primarySvg).not.toBeNull();
    expect(primarySvg).toHaveAttribute('data-category', 'planet');
    expect(primarySvg).not.toHaveAttribute('data-status');

    const bodyDots = screen.getAllByTestId('preview-body-dot');
    expect(bodyDots).toHaveLength(2);
    const symbolTypes = bodyDots.map((node) => node.getAttribute('data-symbol-type')).sort();
    expect(symbolTypes).toEqual(['moon', 'spacecraft']);

    expect(
      screen
        .getByTestId('preview-canvas-slot')
        .querySelector('svg[data-celestial-symbol="moon"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByTestId('preview-canvas-slot')
        .querySelector('svg[data-celestial-symbol="spacecraft"]'),
    ).not.toBeNull();
  });

  it('renders clickable SPA details link when detailsHref is provided and invokes router navigation on click', () => {
    const navigate = vi.fn();
    const mockRouter: AppRouterAdapter = {
      navigate,
      state: { location: { pathname: '/galaxy', searchStr: '?focus=sol' } },
    };

    render(
      <CanvasRouterBridgeContext.Provider value={mockRouter}>
        <PreviewPanel preview={solSystemPreview} />
      </CanvasRouterBridgeContext.Provider>,
    );

    const link = screen.getByTestId('preview-details-link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/system/sol');
    expect(link).toHaveAttribute('aria-label', 'Open Sol System details');

    const wasNotPrevented = fireEvent.click(link);
    expect(wasNotPrevented).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ href: '/system/sol' });
  });

  it('renders non-link SVG when detailsHref is absent', () => {
    render(<PreviewPanel preview={noLinkObjectPreview} />);

    expect(screen.queryByTestId('preview-details-link')).toBeNull();
    const slot = screen.getByTestId('preview-canvas-slot');
    const svg = slot.querySelector('svg[viewBox="0 0 260 156"]');
    expect(svg).not.toBeNull();
    expect(
      screen
        .getByTestId('preview-primary-reticle')
        .querySelector('svg[data-celestial-symbol="star"]'),
    ).not.toBeNull();
  });

  it('renders neutral 0° plane for unmeasured exoplanet systems and real 97.77° tilt for Uranus', () => {
    const tauCetiProjection = buildPreviewProjection(tauCetiUnmeasuredPreview);
    const solProjection = buildPreviewProjection(solSystemPreview);
    const uranusProjection = buildPreviewProjection(uranusPreview);
    const earthProjection = buildPreviewProjection(earthPreview);

    expect(tauCetiProjection.plane.tiltDeg).toBe(0);
    expect(uranusProjection.plane.tiltDeg).toBeCloseTo(97.77, 4);

    const { rerender } = render(<PreviewPanel preview={tauCetiUnmeasuredPreview} />);
    const tauCetiTargetPlane = screen.getByTestId('preview-target-plane-front');
    expect(tauCetiTargetPlane).toHaveAttribute(
      'points',
      tauCetiProjection.targetRing.polygonPoints,
    );
    expect(tauCetiTargetPlane.getAttribute('points')).not.toBe(solProjection.targetRing.polygonPoints);

    rerender(<PreviewPanel preview={uranusPreview} />);
    const uranusTargetPlane = screen.getByTestId('preview-target-plane-front');
    expect(uranusTargetPlane).toHaveAttribute(
      'points',
      uranusProjection.targetRing.polygonPoints,
    );
    expect(uranusTargetPlane.getAttribute('points')).not.toBe(
      earthProjection.targetRing.polygonPoints,
    );
    expect(uranusTargetPlane.getAttribute('points')).not.toBe(
      tauCetiProjection.targetRing.polygonPoints,
    );
    expect(
      screen
        .getByTestId('preview-primary-reticle')
        .querySelector('svg[data-celestial-symbol="ice-giant"]'),
    ).not.toBeNull();
  });

  it('keeps fixed outer projection unchanged when useCameraStore pose changes', () => {
    const { rerender } = render(<PreviewPanel preview={solSystemPreview} />);
    const initialPoints = screen
      .getByTestId('preview-target-plane-front')
      .getAttribute('points');

    useCameraStore.getState().setCameraPose({
      position: [12, 34, 56],
      target: [0, 0, 0],
      up: [0, 0, 1],
    });

    rerender(<PreviewPanel preview={solSystemPreview} />);
    expect(
      screen.getByTestId('preview-target-plane-front').getAttribute('points'),
    ).toBe(initialPoints);
  });
});
