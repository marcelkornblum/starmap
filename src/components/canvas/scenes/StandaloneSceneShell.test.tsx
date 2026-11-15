import { describe, it, expect, vi } from 'vitest';
import type React from 'react';
import { render, screen } from '@testing-library/react';
import { StandaloneSceneShell } from './StandaloneSceneShell';

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children: _children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-canvas" />
    ),
  };
});

describe('StandaloneSceneShell Component', () => {
  it('renders container with data-variant and canvas wrapper', () => {
    const { container } = render(
      <StandaloneSceneShell variant="fullscreen">
        <div data-testid="test-content">Content</div>
      </StandaloneSceneShell>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('data-variant')).toBe('fullscreen');
    expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <StandaloneSceneShell className="custom-class">
        <span>Child</span>
      </StandaloneSceneShell>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('custom-class');
  });
});
