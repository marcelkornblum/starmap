import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuideExamplesList } from './GuideExamplesList';
import type { GuideExampleTarget } from '../../../content/guide';

const mockExamples: readonly GuideExampleTarget[] = [
  {
    id: 'sol',
    name: 'Sol',
    href: '/system/sol?focus=sol',
    note: 'G2V reference standard for solar mass, radius, and luminosity.',
  },
  {
    id: 'earth',
    name: 'Earth',
    href: '/planet/earth',
    note: 'Standard terrestrial reference body for planetary mass and radius.',
  },
];

describe('<GuideExamplesList />', () => {
  it('renders default title and example rows', () => {
    render(<GuideExamplesList examples={mockExamples} />);

    expect(screen.getByText('Canonical System Benchmarks')).toBeInTheDocument();
    expect(screen.getByTestId('guide-examples-list')).toBeInTheDocument();

    const items = screen.getAllByTestId('guide-example-item');
    expect(items.length).toBe(2);

    const links = screen.getAllByTestId('guide-example-link');
    expect(links[0].textContent).toBe('Sol');
    expect(links[1].textContent).toBe('Earth');

    expect(screen.getByText('G2V reference standard for solar mass, radius, and luminosity.')).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(
      <GuideExamplesList
        examples={mockExamples}
        title="Featured Exoplanet Laboratories"
      />
    );

    expect(screen.getByText('Featured Exoplanet Laboratories')).toBeInTheDocument();
  });

  it('uses explicit reticleType from example item or props rather than string matching', () => {
    const examplesWithReticles: readonly GuideExampleTarget[] = [
      {
        id: 'jupiter',
        name: 'Jupiter',
        href: '/planet/jupiter',
        note: 'Gas giant exemplar',
        reticleType: 'gas-giant',
      },
    ];

    const { container } = render(
      <GuideExamplesList examples={examplesWithReticles} />
    );

    const titleEl = container.querySelector('[data-celestial-title="gas-giant"]');
    expect(titleEl).not.toBeNull();
  });

  it('wraps the examples table in a CollapsibleSection that toggles visibility on click', () => {
    render(<GuideExamplesList examples={mockExamples} />);

    const toggle = screen.getByRole('button', { name: /Canonical System Benchmarks/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('guide-examples-list')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('guide-examples-list')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('guide-examples-list')).toBeInTheDocument();
  });

  it('uses a minimal wrapper without an outer Block surface so it does not double-nest cards', () => {
    const { container } = render(<GuideExamplesList examples={mockExamples} />);

    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root?.tagName).toBe('DIV');
    expect(root).not.toHaveAttribute('data-block');
  });
});
