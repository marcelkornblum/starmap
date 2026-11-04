// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Datum } from './Datum';

describe('<Datum /> (data re-export)', () => {
  it('renders re-exported datum component correctly', () => {
    render(<Datum label="Mass" value="1.0" unit="M_☉" status="nominal" />);

    expect(screen.getByText('Mass')).toBeDefined();
    expect(screen.getByText('1.0')).toBeDefined();
    expect(screen.getByText('M_☉')).toBeDefined();
    const root = screen.getByText('Mass').closest('[data-datum="true"]');
    expect(root?.getAttribute('data-status')).toBe('nominal');
  });
});
