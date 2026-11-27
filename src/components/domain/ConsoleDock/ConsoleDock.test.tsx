import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ConsoleDock } from './ConsoleDock';

describe('<ConsoleDock />', () => {
  it('renders primary navigation landmark inside Tier 2 Dock with Icon-wrapped Map, Discover, and Guide items', () => {
    render(<ConsoleDock activeItem="map" onToggleDiscover={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(nav).toHaveAttribute('data-testid', 'console-dock');
    expect(nav.parentElement).toHaveAttribute('data-position', 'floating');
    expect(nav.parentElement).toHaveAttribute('data-padded', 'false');

    const mapItem = screen.getByTestId('console-dock-map');
    const discoverItem = screen.getByTestId('console-dock-discover');
    const guideItem = screen.getByTestId('console-dock-guide');

    expect(mapItem).toHaveAttribute('data-dock-item');
    expect(discoverItem).toHaveAttribute('data-dock-item');
    expect(guideItem).toHaveAttribute('data-dock-item');

    expect(mapItem).toHaveTextContent('Map');
    expect(discoverItem).toHaveTextContent('Discover');
    expect(guideItem).toHaveTextContent('Guide');

    for (const item of [mapItem, discoverItem, guideItem]) {
      const svg = item.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg?.parentElement).toHaveAttribute('data-size', 'md');
      expect(svg?.parentElement).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('uses default hrefs for Map and Guide and sets active state on activeItem="map"', () => {
    render(<ConsoleDock activeItem="map" onToggleDiscover={vi.fn()} />);

    const mapItem = screen.getByTestId('console-dock-map');
    expect(mapItem.tagName.toLowerCase()).toBe('a');
    expect(mapItem).toHaveAttribute('href', '/galaxy');
    expect(mapItem).toHaveAttribute('aria-current', 'page');
    expect(mapItem).toHaveAttribute('data-variant', 'primary');
    expect(mapItem).toHaveAttribute('data-active', 'true');

    const guideItem = screen.getByTestId('console-dock-guide');
    expect(guideItem.tagName.toLowerCase()).toBe('a');
    expect(guideItem).toHaveAttribute('href', '/guide/star-types');
    expect(guideItem).not.toHaveAttribute('aria-current');
    expect(guideItem).toHaveAttribute('data-variant', 'subtle');
    expect(guideItem).not.toHaveAttribute('data-active');
  });

  it('renders Discover as a toggle button with aria-pressed and forwards click event to onToggleDiscover', () => {
    const onToggleDiscover = vi.fn();
    const { rerender } = render(
      <ConsoleDock
        activeItem="map"
        isDiscoverOpen={false}
        onToggleDiscover={onToggleDiscover}
      />,
    );

    const discoverBtn = screen.getByTestId('console-dock-discover');
    expect(discoverBtn.tagName.toLowerCase()).toBe('button');
    expect(discoverBtn).toHaveAttribute('aria-pressed', 'false');
    expect(discoverBtn).not.toHaveAttribute('aria-current');
    expect(discoverBtn).toHaveAttribute('data-variant', 'subtle');

    fireEvent.click(discoverBtn);
    expect(onToggleDiscover).toHaveBeenCalledTimes(1);
    expect(onToggleDiscover.mock.calls[0]?.[0]).toBeDefined();

    rerender(
      <ConsoleDock
        activeItem="map"
        isDiscoverOpen={true}
        onToggleDiscover={onToggleDiscover}
      />,
    );

    expect(discoverBtn).toHaveAttribute('aria-pressed', 'true');
    expect(discoverBtn).toHaveAttribute('data-variant', 'primary');
    expect(discoverBtn).toHaveAttribute('data-active', 'true');
  });

  it('invokes onNavigateItem when Map or Guide is clicked', () => {
    const onNavigateItem = vi.fn();
    render(
      <ConsoleDock
        activeItem="discover"
        mapHref="/galaxy?center=sol"
        guideHref="/guide/planet-types"
        onNavigateItem={onNavigateItem}
      />,
    );

    const mapLink = screen.getByTestId('console-dock-map');
    const guideLink = screen.getByTestId('console-dock-guide');
    expect(mapLink).toHaveAttribute('href', '/galaxy?center=sol');
    expect(guideLink).toHaveAttribute('href', '/guide/planet-types');

    fireEvent.click(mapLink);
    expect(onNavigateItem).toHaveBeenCalledWith('map');

    fireEvent.click(guideLink);
    expect(onNavigateItem).toHaveBeenCalledWith('guide');
  });

  it('does not invoke onNavigateItem on modified-key clicks (e.g. ctrlKey)', () => {
    const onNavigateItem = vi.fn();
    render(
      <ConsoleDock
        activeItem="discover"
        mapHref="/galaxy"
        guideHref="/guide/star-types"
        onNavigateItem={onNavigateItem}
      />,
    );

    const mapLink = screen.getByTestId('console-dock-map');
    const guideLink = screen.getByTestId('console-dock-guide');

    fireEvent.click(mapLink, { ctrlKey: true });
    fireEvent.click(guideLink, { ctrlKey: true });
    expect(onNavigateItem).not.toHaveBeenCalled();
  });

  it('sets active state on Guide when activeItem="guide" and renders Discover as button', () => {
    render(<ConsoleDock activeItem="guide" />);

    const guideItem = screen.getByTestId('console-dock-guide');
    expect(guideItem).toHaveAttribute('aria-current', 'page');
    expect(guideItem).toHaveAttribute('data-variant', 'primary');
    expect(guideItem).toHaveAttribute('data-active', 'true');

    const mapItem = screen.getByTestId('console-dock-map');
    expect(mapItem).not.toHaveAttribute('aria-current');
    expect(mapItem).toHaveAttribute('data-variant', 'subtle');

    const discoverBtn = screen.getByTestId('console-dock-discover');
    expect(discoverBtn.tagName.toLowerCase()).toBe('button');
    expect(discoverBtn).not.toHaveAttribute('aria-current');
  });
});
