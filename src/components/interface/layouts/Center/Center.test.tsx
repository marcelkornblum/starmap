// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Center } from './Center';

describe('<Center />', () => {
  it('renders children within a default div container', () => {
    render(
      <Center data-testid="center-container">
        <span>Centered Content</span>
      </Center>
    );

    const container = screen.getByTestId('center-container');
    expect(container).toBeDefined();
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(screen.getByText('Centered Content')).toBeDefined();
  });

  it('sets default data-max="md", data-gutter="default", and omits boolean data flags', () => {
    render(<Center data-testid="center-container" />);

    const container = screen.getByTestId('center-container');
    expect(container.getAttribute('data-max')).toBe('md');
    expect(container.getAttribute('data-gutter')).toBe('default');
    expect(container.getAttribute('data-and-text')).toBeNull();
    expect(container.getAttribute('data-intrinsic')).toBeNull();
  });

  it('reflects custom max prop on data-max', () => {
    const { rerender } = render(<Center max="xs" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-max')).toBe('xs');

    rerender(<Center max="sm" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-max')).toBe('sm');

    rerender(<Center max="lg" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-max')).toBe('lg');

    rerender(<Center max="xl" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-max')).toBe('xl');

    rerender(<Center max="full" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-max')).toBe('full');
  });

  it('reflects custom gutter prop on data-gutter', () => {
    const { rerender } = render(<Center gutter="none" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-gutter')).toBe('none');

    rerender(<Center gutter="tight" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-gutter')).toBe('tight');

    rerender(<Center gutter="section" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-gutter')).toBe('section');
  });

  it('reflects andText prop on data-and-text', () => {
    const { rerender } = render(<Center andText data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-and-text')).toBe('true');

    rerender(<Center andText={false} data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-and-text')).toBeNull();
  });

  it('reflects intrinsic prop on data-intrinsic', () => {
    const { rerender } = render(<Center intrinsic data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-intrinsic')).toBe('true');

    rerender(<Center intrinsic={false} data-testid="center-container" />);
    expect(screen.getByTestId('center-container').getAttribute('data-intrinsic')).toBeNull();
  });

  it('renders custom HTML elements via polymorphic as prop', () => {
    const { rerender } = render(<Center as="main" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').tagName.toLowerCase()).toBe('main');

    rerender(<Center as="article" data-testid="center-container" />);
    expect(screen.getByTestId('center-container').tagName.toLowerCase()).toBe('article');
  });

  it('forwards HTML and accessibility attributes', () => {
    render(
      <Center
        role="region"
        aria-label="Modal Shell"
        data-testid="center-container"
      />
    );

    const container = screen.getByTestId('center-container');
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Modal Shell');
  });

  it('merges custom className with scoped module class', () => {
    render(<Center className="custom-center" data-testid="center-container" />);

    const container = screen.getByTestId('center-container');
    expect(container.className).toContain('custom-center');
  });
});
