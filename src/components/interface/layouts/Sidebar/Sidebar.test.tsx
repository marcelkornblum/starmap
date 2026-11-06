// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

describe('<Sidebar />', () => {
  it('renders children within a default div container', () => {
    render(
      <Sidebar data-testid="sidebar-container">
        <div>Sidebar Nav</div>
        <div>Main Area</div>
      </Sidebar>
    );

    const container = screen.getByTestId('sidebar-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Sidebar Nav')).toBeDefined();
    expect(screen.getByText('Main Area')).toBeDefined();
  });

  it('sets default data attributes and omits data-no-stretch', () => {
    render(<Sidebar data-testid="sidebar-container" />);

    const container = screen.getByTestId('sidebar-container');
    expect(container.getAttribute('data-side')).toBe('start');
    expect(container.getAttribute('data-width')).toBe('md');
    expect(container.getAttribute('data-content-min')).toBe('50%');
    expect(container.getAttribute('data-gap')).toBe('default');
    expect(container.getAttribute('data-no-stretch')).toBeNull();
  });

  it('reflects side prop on data-side', () => {
    const { rerender } = render(<Sidebar side="end" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-side')).toBe('end');

    rerender(<Sidebar side="start" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-side')).toBe('start');
  });

  it('reflects sideWidth prop on data-width', () => {
    const { rerender } = render(<Sidebar sideWidth="sm" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-width')).toBe('sm');

    rerender(<Sidebar sideWidth="lg" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-width')).toBe('lg');

    rerender(<Sidebar sideWidth="md" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-width')).toBe('md');
  });

  it('reflects contentMin prop on data-content-min', () => {
    const { rerender } = render(<Sidebar contentMin="60%" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-content-min')).toBe('60%');

    rerender(<Sidebar contentMin="70%" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-content-min')).toBe('70%');

    rerender(<Sidebar contentMin="50%" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-content-min')).toBe('50%');
  });

  it('reflects gap prop on data-gap', () => {
    const { rerender } = render(<Sidebar gap="none" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-gap')).toBe('none');

    rerender(<Sidebar gap="tight" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-gap')).toBe('tight');

    rerender(<Sidebar gap="loose" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-gap')).toBe('loose');
  });

  it('reflects noStretch prop on data-no-stretch', () => {
    const { rerender } = render(<Sidebar noStretch data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-no-stretch')).toBe('true');

    rerender(<Sidebar noStretch={false} data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').getAttribute('data-no-stretch')).toBeNull();
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Sidebar as="section" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').tagName.toLowerCase()).toBe('section');

    rerender(<Sidebar as="aside" data-testid="sidebar-container" />);
    expect(screen.getByTestId('sidebar-container').tagName.toLowerCase()).toBe('aside');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Sidebar
        role="navigation"
        aria-label="Target Telemetry Sidebar"
        data-testid="sidebar-container"
      />
    );

    const container = screen.getByTestId('sidebar-container');
    expect(container.getAttribute('role')).toBe('navigation');
    expect(container.getAttribute('aria-label')).toBe('Target Telemetry Sidebar');
  });

  it('merges custom className with scoped module class', () => {
    render(<Sidebar className="custom-sidebar" data-testid="sidebar-container" />);

    const container = screen.getByTestId('sidebar-container');
    expect(container.className).toContain('custom-sidebar');
  });
});
