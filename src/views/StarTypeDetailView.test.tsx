import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useParams } from '@tanstack/react-router';
import { StarTypeDetailView } from './StarTypeDetailView';
import {
  clearGuideExamplesCache,
  seedGuideExamples,
} from '../data/guideExamplesRepository';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));

describe('<StarTypeDetailView />', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({});
    clearGuideExamplesCache();
  });

  it('renders single star type detail view for G8.5V with combinator and telemetry', () => {
    render(<StarTypeDetailView starType="G8.5V" />);
    const root = screen.getByTestId('star-type-detail-view-root');
    expect(root).toBeInTheDocument();
    expect(root.tagName).toBe('MAIN');
    expect(root.getAttribute('data-mode')).toBe('document');
    expect(root.getAttribute('data-star-type')).toBe('G8.5V');
    expect(screen.getByTestId('console-dock-guide')).toHaveAttribute('data-active', 'true');

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
    expect(screen.getByTestId('console-dock-map')).toHaveAttribute('href', '/galaxy?focus=sol');
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

  it('renders dataset-driven examples when guideExamplesRepository is hydrated', () => {
    seedGuideExamples({
      version: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      sections: {
        starTypes: {
          g: [
            {
              id: 'sol',
              name: 'Sol',
              href: '/system/sol',
              note: 'Solar System primary (G2V).',
              reticleType: 'stellar-system',
            },
          ],
        },
        planetTypes: {},
        metricTypes: {},
        hazardTypes: {},
      },
    });
    render(<StarTypeDetailView starType="G2V" />);
    const links = screen.getAllByTestId('guide-example-link');
    expect(links[0]?.textContent).toBe('Sol');
    expect(links[0]?.getAttribute('href')).toBe('/system/sol');
  });

  it('relies on GuideSectionNav for the section link without duplicate breadcrumbs or list-link button and wraps decoded subtype and telemetry in CollapsibleSections', () => {
    const { container } = render(<StarTypeDetailView starType="G8.5V" />);

    expect(screen.queryByTestId('view-breadcrumbs')).toBeNull();
    expect(screen.queryByTestId('star-types-list-link')).toBeNull();
    const sectionLink = container.querySelector('a[href="/guide/star-types"]');
    expect(sectionLink).not.toBeNull();

    const decodedToggle = screen.getByRole('button', { name: /Decoded Yerkes Classification/i });
    expect(decodedToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(decodedToggle);
    expect(decodedToggle).toHaveAttribute('aria-expanded', 'false');

    const telemetryToggle = screen.getByRole('button', { name: /Reference Telemetry Range/i });
    expect(telemetryToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(telemetryToggle);
    expect(telemetryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('guide-detail-telemetry')).toBeNull();
  });
});
