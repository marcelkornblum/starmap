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

    render(<Breadcrumbs items={items} />);

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByTestId('view-breadcrumbs')).toBe(nav);
    expect(screen.queryByTestId('breadcrumbs-mode-menu')).toBeNull();
    expect(screen.queryByTestId('breadcrumbs-mode-galaxy')).toBeNull();
    expect(screen.queryByTestId('breadcrumbs-mode-guide')).toBeNull();
    expect(screen.queryByTestId('breadcrumbs-companion-link')).toBeNull();

    const renderedItems = screen.getAllByTestId('breadcrumb-item');
    expect(renderedItems).toHaveLength(3);

    const links = screen.getAllByTestId('breadcrumb-link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/galaxy'));
    expect(links[1]).toHaveAttribute('href', expect.stringContaining('/system/sol'));

    const current = screen.getByTestId('breadcrumb-current');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveTextContent('Earth');
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

  it('renders keyboard-focusable ancestor links and non-interactive current-page item with accessible celestial titles', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Galaxy', href: '/galaxy' },
          { label: 'Sol', href: '/system/sol', reticleType: 'stellar-system' },
          { label: 'Earth (Terra)', reticleType: 'terrestrial' },
        ]}
      />,
    );

    const galaxyLink = screen.getByRole('link', { name: 'Galaxy' });
    const solLink = screen.getByRole('link', { name: /Sol/ });
    expect(galaxyLink).toBeVisible();
    expect(solLink).toBeVisible();
    expect(solLink).toHaveAttribute('href', expect.stringContaining('/system/sol'));

    const currentItem = screen.getByTestId('breadcrumb-current');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
    expect(currentItem).toHaveTextContent('Earth (Terra)');
    expect(screen.queryByRole('link', { name: /Earth/ })).toBeNull();
  });
});
