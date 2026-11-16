import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useParams } from '@tanstack/react-router';
import { StarTypeDetailView } from './StarTypeDetailView';

describe('<StarTypeDetailView />', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
  });

  it('renders single star type detail view for G8.5V with combinator and telemetry', () => {
    render(<StarTypeDetailView starType="G8.5V" />);
    const root = screen.getByTestId('star-type-detail-view-root');
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('data-star-type')).toBe('G8.5V');

    expect(screen.getAllByText(/G8.5V/i).length).toBeGreaterThan(0);
    const decoded = screen.getByTestId('star-type-decoded-subtype');
    expect(decoded.textContent).toContain('Main-Sequence Dwarf');

    const combinator = screen.getByTestId('star-type-combinator');
    expect(combinator).toBeInTheDocument();

    const summary = screen.getByTestId('guide-detail-summary');
    expect(summary.textContent).toBeTruthy();

    const telemetry = screen.getByTestId('guide-detail-telemetry');
    expect(telemetry.textContent).toContain('Effective Temperature');
  });

  it('renders cards for all classifications when multi-value star type is provided (AUD-092)', () => {
    render(<StarTypeDetailView starType="G2V,K1V" />);
    expect(screen.getByTestId('star-type-detail-view-root')).toBeInTheDocument();
    expect(screen.getByText('G2V')).toBeInTheDocument();
    expect(screen.getByText('K1V')).toBeInTheDocument();
  });

  it('renders compound star types separated by plus (e.g. G2V+K1V) (AUD-092)', () => {
    render(<StarTypeDetailView starType="G2V+K1V" />);
    expect(screen.getByTestId('star-type-detail-view-root')).toBeInTheDocument();
    expect(screen.getByText('G2V')).toBeInTheDocument();
    expect(screen.getByText('K1V')).toBeInTheDocument();
  });

  it('renders focus context return button when ?focus= is provided in search (AUD-092)', () => {
    render(
      <StarTypeDetailView
        starType="g"
        locationSearch="?focus=sol"
      />,
    );
    const focusContext = screen.getByTestId('guide-focus-context');
    expect(focusContext).toBeInTheDocument();
    expect(focusContext.textContent).toContain('sol');
  });

  it('renders fallback gracefully when star type is not recognized', () => {
    render(<StarTypeDetailView starType="warp-star" />);
    expect(screen.getByText(/No guide record found for stellar classification/i)).toBeInTheDocument();
  });

  it('extracts starType from route params via useParams when propStarType is omitted', () => {
    vi.mocked(useParams).mockReturnValue({ starType: 'M' });
    render(<StarTypeDetailView />);
    const root = screen.getByTestId('star-type-detail-view-root');
    expect(root.getAttribute('data-star-type')).toBe('M');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Star Type: M');
  });
});
