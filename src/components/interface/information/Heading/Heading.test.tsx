// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from './Heading';

describe('<Heading />', () => {
  it('renders default h2 element with section size', () => {
    render(<Heading>Stellar Telemetry</Heading>);
    const heading = screen.getByRole('heading', { level: 2, name: 'Stellar Telemetry' });
    expect(heading.tagName.toLowerCase()).toBe('h2');
    expect(heading.getAttribute('data-heading')).toBe('true');
    expect(heading.getAttribute('data-size')).toBe('section');
  });

  it('renders specified heading levels with matching default sizes', () => {
    const { rerender } = render(<Heading as="h1">Hero Title</Heading>);
    let heading = screen.getByRole('heading', { level: 1, name: 'Hero Title' });
    expect(heading.getAttribute('data-size')).toBe('title');

    rerender(<Heading as="h3">Lead Subsection</Heading>);
    heading = screen.getByRole('heading', { level: 3, name: 'Lead Subsection' });
    expect(heading.getAttribute('data-size')).toBe('lead');

    rerender(<Heading as="h4">Eyebrow Minor</Heading>);
    heading = screen.getByRole('heading', { level: 4, name: 'Eyebrow Minor' });
    expect(heading.getAttribute('data-size')).toBe('eyebrow');
  });

  it('allows explicit size prop override', () => {
    render(
      <Heading as="h1" size="hero">
        Supermassive Object
      </Heading>
    );
    const heading = screen.getByRole('heading', { level: 1, name: 'Supermassive Object' });
    expect(heading.getAttribute('data-size')).toBe('hero');
  });

  it('renders heading group with eyebrow, badge, and subtitle when provided', () => {
    render(
      <Heading
        as="h2"
        eyebrow="SYSTEM CATALOG"
        subtitle="Catalogued across Gaia DR3 and Hipparcos ephemerides"
        badge={<span data-testid="badge-indicator">SOLAR ANALOGUE</span>}
      >
        Alpha Centauri A
      </Heading>
    );

    const group = screen.getByText('Alpha Centauri A').closest('[data-heading-group="true"]');
    expect(group).toBeDefined();

    expect(screen.getByText('SYSTEM CATALOG')).toBeDefined();
    expect(screen.getByText('Catalogued across Gaia DR3 and Hipparcos ephemerides')).toBeDefined();
    expect(screen.getByTestId('badge-indicator')).toBeDefined();
  });

  it('applies visuallyHidden data attribute and forwards attributes', () => {
    render(
      <Heading id="stellar-section" visuallyHidden data-testid="styled-h">
        Overview
      </Heading>
    );

    const heading = screen.getByTestId('styled-h');
    expect(heading.getAttribute('id')).toBe('stellar-section');
    expect(heading.getAttribute('data-visually-hidden')).toBe('true');
    expect(heading.className).toMatch(/heading/);
  });
});
