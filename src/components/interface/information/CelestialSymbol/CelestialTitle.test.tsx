import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CelestialTitle } from './CelestialTitle';

const expectPrecedes = (firstNode: Node, secondNode: Node) => {
  const position = firstNode.compareDocumentPosition(secondNode);
  expect((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
};

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

    const badge = root.querySelector('[data-celestial-badge="star"]');
    expect(badge).not.toBeNull();
    expectPrecedes(badge!, titleEl);
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

    const badge = link.parentElement?.querySelector('[data-celestial-badge="terrestrial"]');
    expect(badge).not.toBeNull();
    expectPrecedes(badge!, link);

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

  it('forwards symbolHref and symbolTestId to reticle badge', () => {
    render(
      <CelestialTitle
        type="gas-giant"
        title="Jupiter"
        symbolHref="/guide/planet-types/gas-giant"
        symbolTestId="jupiter-symbol"
        titleTestId="jupiter-title"
      />,
    );

    const symbol = screen.getByTestId('jupiter-symbol');
    const symbolLink = symbol.closest('a') ?? symbol;
    expect(symbolLink.getAttribute('href')).toBe('/guide/planet-types/gas-giant');

    const title = screen.getByTestId('jupiter-title');
    expectPrecedes(symbol, title);
  });

  it('respects showTooltip={false} by suppressing Tooltip wrapper', () => {
    const { unmount } = render(
      <CelestialTitle
        type="star"
        title="Vega"
        showTooltip={true}
      />,
    );
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    unmount();

    render(
      <CelestialTitle
        type="star"
        title="Vega"
        showTooltip={false}
      />,
    );
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('sets data-stretch-link="true" on the link only when stretchLink and href are provided', () => {
    const { rerender } = render(
      <CelestialTitle
        type="star"
        title="Sirius"
        href="/system/sirius"
        stretchLink
        titleTestId="sirius-link"
      />,
    );

    expect(screen.getByTestId('sirius-link')).toHaveAttribute('data-stretch-link', 'true');

    rerender(
      <CelestialTitle
        type="star"
        title="Sirius"
        href="/system/sirius"
        titleTestId="sirius-link"
      />,
    );
    expect(screen.getByTestId('sirius-link')).not.toHaveAttribute('data-stretch-link');

    rerender(
      <CelestialTitle
        type="star"
        title="Sirius"
        stretchLink
        titleTestId="sirius-link"
      />,
    );
    const nonLink = screen.getByTestId('sirius-link');
    expect(nonLink.tagName.toLowerCase()).toBe('span');
    expect(nonLink).not.toHaveAttribute('data-stretch-link');
  });
});
