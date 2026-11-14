// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpectralBadge } from './SpectralBadge';
import { shouldDisplaySpectralBadge } from './spectralBadgeUtils';

describe('<SpectralBadge />', () => {
  describe('shouldDisplaySpectralBadge helper', () => {
    it('returns true for valid spectral types', () => {
      expect(shouldDisplaySpectralBadge('G2V')).toBe(true);
      expect(shouldDisplaySpectralBadge('M4.0V')).toBe(true);
      expect(shouldDisplaySpectralBadge('DA')).toBe(true);
    });

    it('returns false for empty, undefined, or Unknown types', () => {
      expect(shouldDisplaySpectralBadge(undefined)).toBe(false);
      expect(shouldDisplaySpectralBadge('')).toBe(false);
      expect(shouldDisplaySpectralBadge('   ')).toBe(false);
      expect(shouldDisplaySpectralBadge('Unknown')).toBe(false);
    });
  });

  it('renders star badge with resolved guide href when interactive', () => {
    render(<SpectralBadge spectralType="G2V" />);

    const badge = screen.getByRole('link', { name: 'G2V' });
    expect(badge.getAttribute('data-spectral-badge')).toBe('G2V');
    expect(badge.getAttribute('data-category')).toBe('star');
    expect(badge.getAttribute('href')).toContain('/guide/star-types');
  });

  it('renders non-interactive span when interactive is false', () => {
    render(<SpectralBadge spectralType="M4.0V" interactive={false} />);

    const badge = screen.getByText('M4.0V');
    expect(badge.tagName.toLowerCase()).toBe('span');
    expect(badge.getAttribute('data-spectral-badge')).toBe('M4.0V');
  });

  it('renders fallback when spectral type is invalid or Unknown', () => {
    const { container, rerender } = render(
      <SpectralBadge spectralType="Unknown" fallback={<span data-testid="fallback">N/A</span>} />
    );

    expect(screen.getByTestId('fallback').textContent).toBe('N/A');

    rerender(<SpectralBadge spectralType="" />);
    expect(container.firstChild).toBeNull();
  });
});
