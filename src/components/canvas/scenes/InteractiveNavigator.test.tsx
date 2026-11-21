import { describe, it, expect, vi } from 'vitest';
import type React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveNavigator } from './InteractiveNavigator';
import type { SpatialEntityDefinition } from '../entity';

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children: _children, frameloop }: { children?: React.ReactNode; frameloop?: string }) => (
      <div data-testid="mock-canvas" data-frameloop={frameloop} />
    ),
  };
});

const mockAdditionalEntities: readonly SpatialEntityDefinition[] = [
  {
    id: 'test-star-1',
    name: 'Test Star 1',
    classification: 'star',
    position: [10, 0, 5],
  },
];

describe('InteractiveNavigator Component', () => {
  it('renders initial scale canvas cleanly with frameloop="demand"', () => {
    render(<InteractiveNavigator additionalEntities={mockAdditionalEntities} />);
    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-frameloop', 'demand');
  });

  it('maintains a single persistent canvas element when scale transitions via Escape key', () => {
    render(
      <InteractiveNavigator
        initialScale="planet"
        initialPlanetId="earth"
      />,
    );

    const canvasPlanet = screen.getByTestId('mock-canvas');
    expect(canvasPlanet).toBeDefined();

    // Press Escape -> transitions to 'system'
    fireEvent.keyDown(window, { key: 'Escape' });
    const canvasSystem = screen.getByTestId('mock-canvas');
    expect(canvasSystem).toBe(canvasPlanet);

    // Press Escape -> transitions to 'galaxy'
    fireEvent.keyDown(window, { key: 'Escape' });
    const canvasGalaxy = screen.getByTestId('mock-canvas');
    expect(canvasGalaxy).toBe(canvasPlanet);
  });
});
