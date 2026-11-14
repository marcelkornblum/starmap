// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfidencePip } from './ConfidencePip';
import { normalizeConfidence } from './confidencePipUtils';

describe('<ConfidencePip />', () => {
  describe('normalizeConfidence helper', () => {
    it('normalizes confirmed and high to confirmed', () => {
      expect(normalizeConfidence('confirmed')).toEqual({
        canonical: 'confirmed',
        defaultLabel: 'Confirmed',
      });
      expect(normalizeConfidence('high')).toEqual({
        canonical: 'confirmed',
        defaultLabel: 'Confirmed',
      });
    });

    it('normalizes candidate, medium, and moderate to candidate', () => {
      expect(normalizeConfidence('candidate')).toEqual({
        canonical: 'candidate',
        defaultLabel: 'Candidate',
      });
      expect(normalizeConfidence('medium')).toEqual({
        canonical: 'candidate',
        defaultLabel: 'Candidate',
      });
      expect(normalizeConfidence('moderate')).toEqual({
        canonical: 'candidate',
        defaultLabel: 'Candidate',
      });
    });

    it('normalizes theoretical, projected, and low to theoretical', () => {
      expect(normalizeConfidence('theoretical')).toEqual({
        canonical: 'theoretical',
        defaultLabel: 'Theoretical',
      });
      expect(normalizeConfidence('projected')).toEqual({
        canonical: 'theoretical',
        defaultLabel: 'Theoretical',
      });
      expect(normalizeConfidence('low')).toEqual({
        canonical: 'theoretical',
        defaultLabel: 'Theoretical',
      });
    });

    it('normalizes unverified to unverified', () => {
      expect(normalizeConfidence('unverified')).toEqual({
        canonical: 'unverified',
        defaultLabel: 'Unverified',
      });
    });
  });

  it('renders trigger button with accessible label and data attributes', () => {
    render(<ConfidencePip confidence="confirmed" size="lg" />);
    const wrapper = screen.getByTestId('confidence-pip-wrapper');
    expect(wrapper.getAttribute('data-confidence')).toBe('confirmed');
    expect(wrapper.getAttribute('data-size')).toBe('lg');

    const button = screen.getByRole('button', {
      name: 'We have confirmed confidence in this data',
    });
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles uncontrolled tooltip on button click', () => {
    render(<ConfidencePip confidence="candidate" defaultOpen={false} />);
    const button = screen.getByRole('button', {
      name: 'We have candidate confidence in this data',
    });

    expect(screen.queryByTestId('confidence-pip-tooltip')).toBeNull();

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('confidence-pip-tooltip')).toBeDefined();
    expect(screen.getByTestId('confidence-level-name').textContent).toBe('candidate');

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('confidence-pip-tooltip')).toBeNull();
  });

  it('supports custom label and details node', () => {
    render(
      <ConfidencePip
        confidence="confirmed"
        label="Fully Calibrated"
        details={<span data-testid="custom-metric">RUWE 1.02</span>}
        defaultOpen={true}
      />
    );

    const button = screen.getByRole('button', {
      name: 'We have Fully Calibrated confidence in this data',
    });
    expect(button).toBeDefined();

    expect(screen.getByTestId('confidence-level-name').textContent).toBe('Fully Calibrated');
    expect(screen.getByTestId('custom-metric').textContent).toBe('RUWE 1.02');
  });

  it('respects controlled isOpen and triggers onOpenChange and onClick', () => {
    const handleOpenChange = vi.fn();
    const handleClick = vi.fn();

    const { rerender } = render(
      <ConfidencePip
        confidence="theoretical"
        isOpen={false}
        onOpenChange={handleOpenChange}
        onClick={handleClick}
      />
    );

    expect(screen.queryByTestId('confidence-pip-tooltip')).toBeNull();

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    rerender(
      <ConfidencePip
        confidence="theoretical"
        isOpen={true}
        onOpenChange={handleOpenChange}
        onClick={handleClick}
      />
    );

    expect(screen.getByTestId('confidence-pip-tooltip')).toBeDefined();
  });
});
