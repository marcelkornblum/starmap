// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('<Badge /> (data re-export)', () => {
  it('renders re-exported badge component correctly', () => {
    render(
      <Badge status="nominal" confidence="confirmed" category="star">
        Sol
      </Badge>
    );

    const badge = screen.getByText('Sol');
    expect(badge.getAttribute('data-status')).toBe('nominal');
    expect(badge.getAttribute('data-confidence')).toBe('confirmed');
    expect(badge.getAttribute('data-category')).toBe('star');
  });
});
