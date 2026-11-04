// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DirectionsPanel } from './DirectionsPanel';
import { buildJourneyPlan } from '../../../services/journeyService';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';

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

    expect(screen.getByTestId('directions-panel')).toBeDefined();
    expect(screen.getAllByTestId('directions-coming-soon').length).toBeGreaterThan(0);
    expect(screen.getByText('Coming soon')).toBeDefined();
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

    expect(screen.getByTestId('directions-total-distance')).toBeDefined();
    const options = screen.getAllByTestId('directions-option-item');
    expect(options.length).toBeGreaterThan(0);

    const selectButtons = screen.getAllByTestId('directions-option-select');
    fireEvent.click(selectButtons[0]);

    expect(onOptionSelect).toHaveBeenCalledWith(journey.options[0].id);
  });

  it('renders detail mode when an option is selected, and allows returning to options', () => {
    const onOptionSelect = vi.fn();
    const journey = buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      selectedOptionId: 'rel-1g',
      corpus: testCorpus,
    });

    render(
      <DirectionsPanel
        journey={journey}
        activeDetent="full"
        onOptionSelect={onOptionSelect}
      />
    );

    expect(screen.getByTestId('directions-option-profile')).toBeDefined();
    expect(screen.getByTestId('directions-steps-list')).toBeDefined();

    const backButton = screen.getByTestId('directions-back-to-options');
    fireEvent.click(backButton);
    expect(onOptionSelect).toHaveBeenCalledWith(null);
  });
});
