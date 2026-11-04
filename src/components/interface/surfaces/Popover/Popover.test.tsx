// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Popover } from './Popover';

describe('<Popover />', () => {
  it('renders nothing when isOpen is false without a trigger', () => {
    const { container } = render(
      <Popover isOpen={false}>
        Popover Content
      </Popover>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders trigger element even when isOpen is false', () => {
    render(
      <Popover
        isOpen={false}
        trigger={<button type="button">Toggle Popover</button>}
      >
        Popover Content
      </Popover>
    );

    expect(screen.getByRole('button', { name: 'Toggle Popover' })).toBeDefined();
    expect(screen.queryByText('Popover Content')).toBeNull();
  });

  it('renders popover element when isOpen is true with position attribute', () => {
    render(
      <Popover
        isOpen={true}
        position="top"
        data-testid="popover"
      >
        Astrometric Notes
      </Popover>
    );

    const popover = screen.getByTestId('popover');
    expect(popover.getAttribute('data-position')).toBe('top');
    expect(popover.textContent).toBe('Astrometric Notes');
  });

  it('resolves region role when aria-label or aria-labelledby is provided', () => {
    render(
      <Popover
        isOpen={true}
        aria-label="Filter Options"
        data-testid="popover"
      >
        Filters
      </Popover>
    );

    const popover = screen.getByRole('region', { name: 'Filter Options' });
    expect(popover).toBeDefined();
  });

  it('allows explicit role override', () => {
    render(
      <Popover
        isOpen={true}
        role="dialog"
        data-testid="popover"
      >
        Dialog Popover
      </Popover>
    );

    const popover = screen.getByRole('dialog');
    expect(popover).toBeDefined();
  });
});
