import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Button } from './Button';
import { SemanticRoles } from './Button.stories';

describe('<Button />', () => {
  it('renders a button element with default attributes and children', () => {
    render(<Button>Engage</Button>);
    const button = screen.getByRole('button', { name: 'Engage' });
    expect(button).toBeInTheDocument();
    expect(button.tagName.toLowerCase()).toBe('button');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-variant', 'default');
    expect(button).toHaveAttribute('data-size', 'md');
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
    expect(button).toHaveAttribute('data-disabled', 'true');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('sets data-selected="true" when selected on both button and anchor modes', () => {
    const { rerender } = render(
      <Button variant="subtle" selected>
        Discover
      </Button>
    );
    expect(screen.getByRole('button', { name: 'Discover' })).toHaveAttribute('data-selected', 'true');

    rerender(
      <Button variant="subtle" selected={false}>
        Discover
      </Button>
    );
    expect(screen.getByRole('button', { name: 'Discover' })).not.toHaveAttribute('data-selected');

    rerender(
      <Button href="/guide" variant="subtle" selected>
        Guide
      </Button>
    );
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute('data-selected', 'true');
  });

  it('supports disabled anchor mode with aria-disabled, data-disabled, tabIndex=-1, and blocks click navigation', () => {
    const handleClick = vi.fn();
    render(
      <Button href="/system/sol" disabled onClick={handleClick}>
        Locked Link
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Locked Link' });
    expect(link).toHaveAttribute('href');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('data-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const notPrevented = link.dispatchEvent(event);
    expect(notPrevented).toBe(false);
    expect(event.defaultPrevented).toBe(true);
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

  it('binds scoped module class statically without custom className per DEC-R050', () => {
    render(<Button>Styled</Button>);
    const button = screen.getByRole('button', { name: 'Styled' });
    expect(button).toHaveAttribute('class');
    expect(button.className.length).toBeGreaterThan(0);
  });

  it('preserves data-disabled alongside data-selected when both selected and disabled are set', () => {
    render(
      <Button variant="subtle" selected disabled>
        Locked Selected
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Locked Selected' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button).toHaveAttribute('data-disabled', 'true');
    expect(button).toHaveAttribute('data-selected', 'true');
    expect(button).toHaveAttribute('data-variant', 'subtle');
  });

  it('showcases distinct semantic roles side-by-side in Button.stories SemanticRoles', () => {
    const renderStory = SemanticRoles.render as (() => ReactElement) | undefined;
    expect(renderStory).toBeTypeOf('function');
    render(renderStory!());

    const defaultBtn = screen.getByRole('button', { name: 'Default' });
    const primaryBtn = screen.getByRole('button', { name: 'Primary CTA' });
    const subtleBtn = screen.getByRole('button', { name: 'Subtle' });
    const selectedBtn = screen.getByRole('button', { name: 'Selected' });
    const dangerBtn = screen.getByRole('button', { name: 'Danger' });
    const disabledBtn = screen.getByRole('button', { name: 'Disabled' }) as HTMLButtonElement;

    expect(defaultBtn).toHaveAttribute('data-variant', 'default');
    expect(defaultBtn).not.toHaveAttribute('data-selected');
    expect(primaryBtn).toHaveAttribute('data-variant', 'primary');
    expect(subtleBtn).toHaveAttribute('data-variant', 'subtle');
    expect(selectedBtn).toHaveAttribute('data-selected', 'true');
    expect(dangerBtn).toHaveAttribute('data-variant', 'danger');
    expect(disabledBtn.disabled).toBe(true);
    expect(disabledBtn).toHaveAttribute('data-disabled', 'true');
  });
});
