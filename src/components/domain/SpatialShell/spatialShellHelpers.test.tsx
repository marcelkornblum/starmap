import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resolvePrimaryPanels } from './spatialShellHelpers';

describe('spatialShellHelpers - resolvePrimaryPanels', () => {
  it('returns primaryFloat if passed alone', () => {
    const result = resolvePrimaryPanels({
      primaryFloat: <div data-testid="legacy-float">Float</div>,
    });

    render(<div>{result}</div>);
    expect(screen.getByTestId('legacy-float')).toBeInTheDocument();
  });

  it('returns detailsPanel when only detailsPanel is provided and open', () => {
    const result = resolvePrimaryPanels({
      detailsPanel: <div data-testid="details">Details</div>,
      isDetailsOpen: true,
    });

    render(<div>{result}</div>);
    expect(screen.getByTestId('details')).toBeInTheDocument();
    expect(screen.queryByTestId('directions')).toBeNull();
  });

  it('returns directionsPanel when only directionsPanel is provided and open', () => {
    const result = resolvePrimaryPanels({
      directionsPanel: <div data-testid="directions">Directions</div>,
      isDirectionsOpen: true,
    });

    render(<div>{result}</div>);
    expect(screen.getByTestId('directions')).toBeInTheDocument();
    expect(screen.queryByTestId('details')).toBeNull();
  });

  it('renders both panels in priority order when dualPanelPolicy is simultaneous', () => {
    const details = <div data-testid="details">Details</div>;
    const directions = <div data-testid="directions">Directions</div>;

    const directionsFirst = resolvePrimaryPanels({
      detailsPanel: details,
      directionsPanel: directions,
      isDetailsOpen: true,
      isDirectionsOpen: true,
      primaryPanelPriority: 'directions',
      dualPanelPolicy: 'simultaneous',
    });

    const { unmount, container: containerDir } = render(<div>{directionsFirst}</div>);
    expect(screen.getByTestId('directions')).toBeInTheDocument();
    expect(screen.getByTestId('details')).toBeInTheDocument();
    const childrenDir = containerDir.firstElementChild?.children;
    expect(childrenDir?.[0]?.getAttribute('data-testid')).toBe('directions');
    expect(childrenDir?.[1]?.getAttribute('data-testid')).toBe('details');
    unmount();

    const detailsFirst = resolvePrimaryPanels({
      detailsPanel: details,
      directionsPanel: directions,
      isDetailsOpen: true,
      isDirectionsOpen: true,
      primaryPanelPriority: 'details',
      dualPanelPolicy: 'simultaneous',
    });

    const { container: containerDet } = render(<div>{detailsFirst}</div>);
    expect(screen.getByTestId('details')).toBeInTheDocument();
    expect(screen.getByTestId('directions')).toBeInTheDocument();
    const childrenDet = containerDet.firstElementChild?.children;
    expect(childrenDet?.[0]?.getAttribute('data-testid')).toBe('details');
    expect(childrenDet?.[1]?.getAttribute('data-testid')).toBe('directions');
  });

  it('behaves responsively under dualPanelPolicy auto based on isWideViewport', () => {
    const details = <div data-testid="details">Details</div>;
    const directions = <div data-testid="directions">Directions</div>;

    // Narrow (< 1920px) -> single panel matching priority
    const narrow = resolvePrimaryPanels({
      detailsPanel: details,
      directionsPanel: directions,
      primaryPanelPriority: 'directions',
      dualPanelPolicy: 'auto',
      isWideViewport: false,
    });

    const { unmount } = render(<div>{narrow}</div>);
    expect(screen.getByTestId('directions')).toBeInTheDocument();
    expect(screen.queryByTestId('details')).toBeNull();
    unmount();

    // Ultrawide (>= 1920px) -> simultaneous dual panels
    const wide = resolvePrimaryPanels({
      detailsPanel: details,
      directionsPanel: directions,
      primaryPanelPriority: 'directions',
      dualPanelPolicy: 'auto',
      isWideViewport: true,
    });

    render(<div>{wide}</div>);
    expect(screen.getByTestId('directions')).toBeInTheDocument();
    expect(screen.getByTestId('details')).toBeInTheDocument();
  });

  it('handles closed panel states cleanly', () => {
    const result = resolvePrimaryPanels({
      detailsPanel: <div data-testid="details">Details</div>,
      directionsPanel: <div data-testid="directions">Directions</div>,
      isDetailsOpen: false,
      isDirectionsOpen: false,
    });

    expect(result).toBeNull();
  });
});
