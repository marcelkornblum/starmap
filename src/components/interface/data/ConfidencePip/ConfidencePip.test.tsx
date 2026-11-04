// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidencePip } from './ConfidencePip';

describe('<ConfidencePip /> (data re-export)', () => {
  it('renders re-exported confidence pip correctly', () => {
    render(<ConfidencePip confidence="confirmed" size="md" />);

    const wrapper = screen.getByTestId('confidence-pip-wrapper');
    expect(wrapper.getAttribute('data-confidence')).toBe('confirmed');
    expect(wrapper.getAttribute('data-size')).toBe('md');
  });
});
