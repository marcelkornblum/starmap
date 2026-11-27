import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

describe('<Breadcrumbs />', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumb items, marks last item as current page, and does not render a mode menu', () => {
    const items = [
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Sol', href: '/system/sol' },
      { label: 'Earth' },
    ];

    render(
      <Breadcrumbs
        items={items}
      />
    );

    expect(screen.getByTestId('view-breadcrumbs')).toBeInTheDocument();
    expect(screen.queryByTestId('breadcrumbs-mode-menu')).toBeNull();
    expect(screen.queryByTestId('breadcrumbs-mode-galaxy')).toBeNull();
    expect(screen.queryByTestId('breadcrumbs-mode-guide')).toBeNull();
    expect(screen.queryByTestId('breadcrumbs-companion-link')).toBeNull();

    const renderedItems = screen.getAllByTestId('breadcrumb-item');
    expect(renderedItems.length).toBe(3);

    const links = screen.getAllByTestId('breadcrumb-link');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toContain('/galaxy');
    expect(links[1].getAttribute('href')).toContain('/system/sol');

    const current = screen.getByTestId('breadcrumb-current');
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.textContent).toContain('Earth');
  });

  it('renders explicit reticleType and does not infer from index or label', () => {
    const items = [
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Tau Ceti', href: '/system/tau-ceti', reticleType: 'stellar-system' as const },
      { label: 'Tau Ceti e', reticleType: 'super-earth' as const },
    ];
    const { container } = render(<Breadcrumbs items={items} />);

    expect(container.querySelector('[data-celestial-title="stellar-system"]')).not.toBeNull();
    expect(container.querySelector('[data-celestial-title="super-earth"]')).not.toBeNull();
  });

  it('defines coarse-pointer hit-slop ::before expansion and readable mobile typography in CSS module', () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, 'Breadcrumbs.module.css'), 'utf8');
    expect(css).not.toMatch(/\.modeMenu/);
    expect(css).not.toMatch(/data-mode-button/);
    expect(css).not.toMatch(/--type-scale-neg-2/);
    expect(css).toMatch(/\.breadcrumbItem\s+a[\s\S]*position:\s*relative/);
    expect(css).toMatch(/--breadcrumbs-hit-slop-block:\s*var\(--space-hit-slop-block\)/);
    expect(css).toMatch(/--breadcrumbs-hit-slop-inline:\s*var\(--space-hit-slop-inline\)/);
    expect(css).toMatch(/@media\s*\(\s*pointer:\s*coarse\s*\)/);
    expect(css).toMatch(/\.breadcrumbItem\s+a::before/);
    expect(css).toMatch(/inset-block:\s*var\(--breadcrumbs-hit-slop-block\)/);
    expect(css).toMatch(/inset-inline:\s*var\(--breadcrumbs-hit-slop-inline\)/);
  });
});
