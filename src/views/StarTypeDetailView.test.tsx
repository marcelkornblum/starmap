// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarTypeDetailView } from './StarTypeDetailView';

describe('<StarTypeDetailView />', () => {
  it('renders single star type detail view for G8.5V', () => {
    render(<StarTypeDetailView starType="G8.5V" />);
    expect(screen.getByTestId('star-type-detail-view-root')).toBeDefined();
    expect(screen.getAllByText(/G8.5V/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('star-type-decoded-subtype')).toBeDefined();
  });

  it('renders cards for all classifications when multi-value star type is provided (AUD-092)', () => {
    render(<StarTypeDetailView starType="G2V,K1V" />);
    expect(screen.getByTestId('star-type-detail-view-root')).toBeDefined();
    expect(screen.getByText('G2V')).toBeDefined();
    expect(screen.getByText('K1V')).toBeDefined();
  });

  it('renders compound star types separated by plus (e.g. G2V+K1V) (AUD-092)', () => {
    render(<StarTypeDetailView starType="G2V+K1V" />);
    expect(screen.getByTestId('star-type-detail-view-root')).toBeDefined();
    expect(screen.getByText('G2V')).toBeDefined();
    expect(screen.getByText('K1V')).toBeDefined();
  });

  it('renders focus context return button when ?focus= is provided in search (AUD-092)', () => {
    render(
      <StarTypeDetailView
        starType="g"
        locationSearch="?focus=sol"
      />,
    );
    const focusContext = screen.getByTestId('guide-focus-context');
    expect(focusContext).toBeDefined();
    expect(focusContext.textContent).toContain('sol');
  });

  it('renders fallback gracefully when star type is not recognized', () => {
    render(<StarTypeDetailView starType="warp-star" />);
    expect(screen.getByText(/No guide record found for stellar classification/i)).toBeDefined();
  });
});
