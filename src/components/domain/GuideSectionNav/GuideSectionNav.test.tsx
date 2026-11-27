import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from '@tanstack/react-router';
import { GuideSectionNav } from './GuideSectionNav';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: vi.fn(() => undefined),
  };
});

describe('<GuideSectionNav />', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      navigate: mockNavigate,
      history: { push: mockNavigate },
    } as never);
  });

  it('renders all 5 guide section links', () => {
    render(<GuideSectionNav />);

    const nav = screen.getByTestId('guide-section-nav');
    expect(nav).toBeInTheDocument();
    expect(nav.querySelector('ul')).not.toBeNull();

    expect(screen.getByRole('link', { name: 'Star Types' })).toHaveAttribute('href', '/guide/star-types');
    expect(screen.getByRole('link', { name: 'Planet Types' })).toHaveAttribute('href', '/guide/planet-types');
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' })).toHaveAttribute('href', '/guide/metrics');
    expect(screen.getByRole('link', { name: 'Environmental Hazards' })).toHaveAttribute('href', '/guide/hazards');
    expect(screen.getByRole('link', { name: 'Legend' })).toHaveAttribute('href', '/guide/legend');
  });

  it('marks current section with aria-current="page"', () => {
    const { rerender } = render(<GuideSectionNav currentSection="star-types" />);
    expect(screen.getByRole('link', { name: 'Star Types' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Planet Types' }).getAttribute('aria-current')).toBeNull();

    rerender(<GuideSectionNav currentSection="metrics" />);
    expect(screen.getByRole('link', { name: 'Star Types' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' }).getAttribute('aria-current')).toBe('page');

    rerender(<GuideSectionNav currentSection="legend" />);
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Legend' }).getAttribute('aria-current')).toBe('page');
  });

  it('navigates via SPA router on unmodified click and respects modified clicks', () => {
    render(<GuideSectionNav currentSection="star-types" />);

    const metricsLink = screen.getByRole('link', { name: 'Telemetry Metrics' });
    const clickHandled = fireEvent.click(metricsLink);
    expect(clickHandled).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith({ href: '/guide/metrics' });

    mockNavigate.mockClear();
    const ctrlHandled = fireEvent.click(screen.getByRole('link', { name: 'Legend' }), { ctrlKey: true });
    expect(ctrlHandled).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('defines sticky horizontal nowrap tab bar and coarse-pointer tap target in CSS module', () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, 'GuideSectionNav.module.css'), 'utf8');
    expect(css).toMatch(/position:\s*sticky/);
    expect(css).toMatch(/top:\s*0/);
    expect(css).toMatch(/overflow-x:\s*auto/);
    expect(css).toMatch(/scrollbar-width:\s*none/);
    expect(css).toMatch(/\.sectionNav\s*>\s*ul/);
    expect(css).toMatch(/flex-wrap:\s*nowrap/);
    expect(css).toMatch(/white-space:\s*nowrap/);
    expect(css).toMatch(/--guide-section-nav-link-active-indicator:\s*var\(--state-focus\)/);
    expect(css).toMatch(/border-block-end-color:\s*var\(--guide-section-nav-link-active-indicator\)/);
    expect(css).toMatch(/@media\s*\(\s*pointer:\s*coarse\s*\)/);
    expect(css).toMatch(/min-block-size:\s*var\(--size-touch-target-min\)/);
  });
});
