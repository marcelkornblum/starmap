// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('<Button />', () => {
  it('renders a button element with default attributes and children', () => {
    render(<Button>Engage</Button>);
    const button = screen.getByRole('button', { name: 'Engage' });
    expect(button).toBeDefined();
    expect(button.tagName.toLowerCase()).toBe('button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('data-variant')).toBe('default');
    expect(button.getAttribute('data-size')).toBe('md');
  });

  it('renders all variant attributes correctly', () => {
    const { rerender } = render(<Button variant="primary">Launch</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('primary');

    rerender(<Button variant="subtle">Launch</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('subtle');

    rerender(<Button variant="danger">Abort</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('danger');

    rerender(<Button variant="default">Idle</Button>);
    expect(screen.getByRole('button').getAttribute('data-variant')).toBe('default');
  });

  it('renders all size attributes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').getAttribute('data-size')).toBe('sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button').getAttribute('data-size')).toBe('md');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button').getAttribute('data-size')).toBe('lg');
  });

  it('handles click events via onClick', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Fire Thrusters</Button>);

    const button = screen.getByRole('button', { name: 'Fire Thrusters' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state and prevents click handler invocation', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Locked
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Locked' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ARIA attributes and native button types', () => {
    render(
      <Button
        type="submit"
        aria-label="Confirm navigation"
        aria-expanded={true}
        aria-controls="nav-drawer"
      >
        Go
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Confirm navigation' });
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe('nav-drawer');
  });

  it('renders an anchor tag when href is provided', () => {
    render(
      <Button href="/system/sol" target="_blank" rel="noopener noreferrer">
        Warp to Sol
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Warp to Sol' });
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toContain('/system/sol');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('data-variant')).toBe('default');
    expect(link.getAttribute('data-size')).toBe('md');
  });

  it('merges custom className with scoped module class', () => {
    render(<Button className="custom-override">Styled</Button>);
    const button = screen.getByRole('button', { name: 'Styled' });
    expect(button.className).toContain('custom-override');
  });
});
