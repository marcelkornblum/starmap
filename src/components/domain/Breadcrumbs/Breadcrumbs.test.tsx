// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

describe('<Breadcrumbs />', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumb items and marks last item as current page', () => {
    const items = [
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Sol', href: '/system/sol' },
      { label: 'Earth' },
    ];

    render(<Breadcrumbs items={items} />);

    expect(screen.getByTestId('view-breadcrumbs')).toBeDefined();
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

  it('renders mode menu with Galaxy active in galaxy context', () => {
    const items = [{ label: 'Galaxy', href: '/galaxy' }, { label: 'Sol' }];
    render(<Breadcrumbs items={items} companionHref="/guide/star-types/G2V" />);

    const modeMenu = screen.getByTestId('breadcrumbs-mode-menu');
    expect(modeMenu).toBeDefined();

    const galaxyBtn = screen.getByTestId('breadcrumbs-mode-galaxy');
    expect(galaxyBtn.getAttribute('aria-current')).toBe('page');

    const companionLink = screen.getByTestId('breadcrumbs-companion-link');
    expect(companionLink.getAttribute('href')).toContain('/guide/star-types/G2V');
  });

  it('renders mode menu with Guide active in guide context', () => {
    const items = [{ label: 'Guide', href: '/guide' }, { label: 'Star Types' }];
    render(<Breadcrumbs items={items} companionHref="/galaxy?focus=sol" />);

    const guideBtn = screen.getByTestId('breadcrumbs-mode-guide');
    expect(guideBtn.getAttribute('aria-current')).toBe('page');

    const companionLink = screen.getByTestId('breadcrumbs-companion-link');
    expect(companionLink.getAttribute('href')).toContain('/galaxy?focus=sol');
  });

  it('falls back to default /galaxy companion href in guide context when companionHref is omitted', () => {
    const items = [{ label: 'Guide', href: '/guide/star-types' }, { label: 'Star Types' }];
    render(<Breadcrumbs items={items} />);

    const companionLink = screen.getByTestId('breadcrumbs-companion-link');
    expect(companionLink.getAttribute('href')).toBe('/galaxy');
  });

  it('renders explicit reticleType and does not infer from index or label', () => {
    const items = [
      { label: 'Galaxy', href: '/galaxy' },
      { label: 'Tau Ceti', href: '/system/tau-ceti', reticleType: 'stellar-system' as const },
      { label: 'Tau Ceti e', reticleType: 'super-earth' as const },
    ];
    const { container } = render(<Breadcrumbs items={items} />);

    expect(container.querySelector('[data-type="stellar-system"]')).toBeDefined();
    expect(container.querySelector('[data-type="super-earth"]')).toBeDefined();
  });
});
