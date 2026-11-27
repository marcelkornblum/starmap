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

  it('renders all 5 guide section links with subtle variant by default', () => {
    render(<GuideSectionNav />);

    const nav = screen.getByTestId('guide-section-nav');
    expect(nav).toBeInTheDocument();
    expect(nav.querySelector('ul')).not.toBeNull();

    const expectedLinks = [
      ['Star Types', '/guide/star-types'],
      ['Planet Types', '/guide/planet-types'],
      ['Telemetry Metrics', '/guide/metrics'],
      ['Environmental Hazards', '/guide/hazards'],
      ['Legend', '/guide/legend'],
    ] as const;

    for (const [label, href] of expectedLinks) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('data-variant', 'subtle');
      expect(link).not.toHaveAttribute('aria-current');
    }
  });

  it('marks current section with data-variant="primary" and aria-current="page", and inactive items with data-variant="subtle"', () => {
    const { rerender } = render(<GuideSectionNav currentSection="star-types" />);
    expect(screen.getByRole('link', { name: 'Star Types' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Star Types' })).toHaveAttribute('data-variant', 'primary');
    expect(screen.getByRole('link', { name: 'Planet Types' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Planet Types' })).toHaveAttribute('data-variant', 'subtle');

    rerender(<GuideSectionNav currentSection="metrics" />);
    expect(screen.getByRole('link', { name: 'Star Types' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Star Types' })).toHaveAttribute('data-variant', 'subtle');
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' })).toHaveAttribute('data-variant', 'primary');

    rerender(<GuideSectionNav currentSection="legend" />);
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Telemetry Metrics' })).toHaveAttribute('data-variant', 'subtle');
    expect(screen.getByRole('link', { name: 'Legend' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Legend' })).toHaveAttribute('data-variant', 'primary');
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
});
