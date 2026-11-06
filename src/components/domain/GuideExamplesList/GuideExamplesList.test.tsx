// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuideExamplesList } from './GuideExamplesList';
import type { GuideExampleTarget } from '../../../services/guideService';

const mockExamples: readonly GuideExampleTarget[] = [
  {
    name: 'Sol',
    href: '/system/sol?focus=sol',
    note: 'G2V reference standard for solar mass, radius, and luminosity.',
  },
  {
    name: 'Earth',
    href: '/planet/earth',
    note: 'Standard terrestrial reference body for planetary mass and radius.',
  },
];

describe('<GuideExamplesList />', () => {
  it('renders default title and example rows', () => {
    render(<GuideExamplesList examples={mockExamples} />);

    expect(screen.getByText('Canonical System Benchmarks')).toBeDefined();
    expect(screen.getByTestId('guide-examples-list')).toBeDefined();

    const items = screen.getAllByTestId('guide-example-item');
    expect(items.length).toBe(2);

    const links = screen.getAllByTestId('guide-example-link');
    expect(links[0].textContent).toBe('Sol');
    expect(links[1].textContent).toBe('Earth');

    expect(screen.getByText('G2V reference standard for solar mass, radius, and luminosity.')).toBeDefined();
  });

  it('renders custom title when provided', () => {
    render(
      <GuideExamplesList
        examples={mockExamples}
        title="Featured Exoplanet Laboratories"
      />
    );

    expect(screen.getByText('Featured Exoplanet Laboratories')).toBeDefined();
  });
});
