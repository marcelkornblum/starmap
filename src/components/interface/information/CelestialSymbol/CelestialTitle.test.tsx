// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CelestialTitle } from './CelestialTitle';

describe('<CelestialTitle />', () => {
  it('renders celestial symbol badge and title with wrapper data attribute', () => {
    render(
      <CelestialTitle
        type="star"
        title="Betelgeuse"
        data-testid="celestial-title"
        titleTestId="title-text"
      />
    );

    const root = screen.getByTestId('celestial-title');
    expect(root.getAttribute('data-celestial-title')).toBe('star');

    const titleEl = screen.getByTestId('title-text');
    expect(titleEl.tagName.toLowerCase()).toBe('span');
    expect(titleEl.textContent).toBe('Betelgeuse');
  });

  it('renders title as a link when href is provided', () => {
    const handleClick = vi.fn();
    render(
      <CelestialTitle
        type="terrestrial"
        title="Earth"
        href="/system/sol/earth"
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        titleTestId="earth-link"
      />
    );

    const link = screen.getByTestId('earth-link');
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toContain('/system/sol/earth');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');

    fireEvent.click(link);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('wraps link in heading element when as="h2" with href', () => {
    render(
      <CelestialTitle
        type="neutron-star"
        title="Crab Pulsar"
        as="h2"
        href="/targets/pulsar"
        titleTestId="pulsar-link"
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeDefined();

    const link = screen.getByTestId('pulsar-link');
    expect(heading.contains(link)).toBe(true);
  });

  it('renders title element as h3 when as="h3" without href', () => {
    render(
      <CelestialTitle
        type="super-earth"
        title="Kepler-452b"
        as="h3"
        titleTestId="kepler-h3"
      />
    );

    const heading = screen.getByRole('heading', { level: 3, name: 'Kepler-452b' });
    expect(heading).toBeDefined();
  });
});
