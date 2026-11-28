import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DirectionsPanel } from './DirectionsPanel';
import { buildJourneyPlan } from '../../../services/journey/journeyBuilder';
import type { CompactSearchEntry } from '../../../utils/compactDataTypes';

const testCorpus: readonly CompactSearchEntry[] = [
  { i: 'sol', n: 'Sol', h: 1, p: [0, 0, 0], m: [-26.74, 'G2V', 8, 1] },
  { i: 'tau-ceti', n: 'Tau Ceti', p: [-2.61, 1.83, -1.72], m: [3.5, 'G8.5V', 4, 1] },
  {
    i: 'earth',
    n: 'Earth',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    r: 3,
    A: 1.0,
    P: 365.256,
    z: 1,
  },
];

describe('<DirectionsPanel />', () => {
  it('returns null when journey is null', () => {
    const { container } = render(<DirectionsPanel journey={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders coming soon status for cross-scope unsupported routes', () => {
    const comingSoonJourney = buildJourneyPlan({
      stops: ['sol', 'earth'],
      viewScope: 'galaxy',
      corpus: testCorpus,
    });

    render(<DirectionsPanel journey={comingSoonJourney} activeDetent="peek" />);

    expect(screen.getByTestId('directions-panel')).toBeInTheDocument();
    expect(screen.getAllByTestId('directions-coming-soon').length).toBeGreaterThan(0);
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('renders options overview mode and allows selecting an option', () => {
    const onOptionSelect = vi.fn();
    const journey = buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      corpus: testCorpus,
    });

    render(
      <DirectionsPanel
        journey={journey}
        activeDetent="partial"
        onOptionSelect={onOptionSelect}
      />
    );

    expect(screen.getByTestId('directions-total-distance')).toBeInTheDocument();
    const closeButton = screen.getByTestId('directions-close-button');
    expect(closeButton).toHaveAttribute('aria-label', 'Close directions');
    expect(closeButton).toHaveAttribute('data-variant', 'subtle');
    expect(closeButton).toHaveAttribute('data-size', 'sm');
    expect(closeButton.querySelector('[data-size="sm"] svg')).not.toBeNull();

    const options = screen.getAllByTestId('directions-option-item');
    expect(options.length).toBeGreaterThan(0);

    const selectButtons = screen.getAllByTestId('directions-option-select');
    expect(selectButtons[0]).toHaveAttribute('data-variant', 'default');
    expect(selectButtons[0]).toHaveAttribute('data-size', 'sm');
    fireEvent.click(selectButtons[0]);

    expect(journey).not.toBeNull();
    expect(onOptionSelect).toHaveBeenCalledWith(journey!.options[0].id);
  });

  it('renders detail mode when an option is selected, and allows returning to options', () => {
    const onOptionSelect = vi.fn();
    const journey = buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      selectedOptionId: 'torchship-1g',
      corpus: testCorpus,
    });

    render(
      <DirectionsPanel
        journey={journey}
        activeDetent="full"
        onOptionSelect={onOptionSelect}
      />
    );

    expect(screen.getByTestId('directions-option-profile')).toBeInTheDocument();
    expect(screen.getByTestId('directions-steps-list')).toBeInTheDocument();

    const backButton = screen.getByTestId('directions-back-to-options');
    expect(backButton).toHaveAttribute('data-variant', 'default');
    expect(backButton).toHaveAttribute('data-size', 'sm');
    fireEvent.click(backButton);
    expect(onOptionSelect).toHaveBeenCalledWith(null);
  });

  it('renders geometry list data table when activeDetent is full in options overview', () => {
    const journey = buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      corpus: testCorpus,
    });

    render(
      <DirectionsPanel
        journey={journey}
        activeDetent="full"
      />
    );

    const geometryList = screen.getByTestId('directions-geometry-list');
    expect(geometryList).toBeInTheDocument();
    expect(screen.getAllByTestId('directions-geometry-leg').length).toBeGreaterThan(0);
    expect(within(geometryList).getByText(/Δz/)).toBeInTheDocument();
  });

  it('renders intra-system secondary geometry and full step detail geometry datum', () => {
    const intraJourney = buildJourneyPlan({
      stops: ['earth', 'mars'],
      corpus: [
        ...testCorpus,
        {
          i: 'mars',
          n: 'Mars',
          k: 2,
          s: 'sol',
          p: [0, 0, 0],
          r: 4,
          A: 1.524,
          P: 686.98,
        },
      ],
    });

    render(
      <DirectionsPanel
        journey={intraJourney}
        activeDetent="full"
      />
    );

    expect(screen.getByTestId('directions-stat-geometry')).toBeInTheDocument();
  });

  it('wraps Route Geometry, Step Details, Flight Profile, and Transit Steps in CollapsibleSections', () => {
    const overviewJourney = buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      corpus: testCorpus,
    });

    const { rerender } = render(
      <DirectionsPanel journey={overviewJourney} activeDetent="full" />,
    );

    const geometryToggle = screen.getByRole('button', { name: /Route Geometry/i });
    expect(geometryToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(geometryToggle);
    expect(geometryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('directions-geometry-list')).toBeNull();

    const stepDetailsToggle = screen.getByRole('button', { name: /Step Details/i });
    expect(stepDetailsToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(stepDetailsToggle);
    expect(stepDetailsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('directions-steps-list')).toBeNull();

    const detailJourney = buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      selectedOptionId: 'torchship-1g',
      corpus: testCorpus,
    });

    rerender(<DirectionsPanel journey={detailJourney} activeDetent="full" />);

    const profileToggle = screen.getByRole('button', { name: /Flight Profile/i });
    expect(profileToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(profileToggle);
    expect(profileToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('directions-option-telemetry-list')).toBeNull();

    const transitStepsToggle = screen.getByRole('button', { name: /Transit Steps & Timings/i });
    expect(transitStepsToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(transitStepsToggle);
    expect(transitStepsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('directions-steps-list')).toBeNull();
  });
});
