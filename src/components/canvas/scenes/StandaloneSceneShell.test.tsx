import { describe, it, expect, vi } from 'vitest';
import type React from 'react';
import { render, screen } from '@testing-library/react';
import { StandaloneSceneShell } from './StandaloneSceneShell';
import {
  SpatialEntityStoreContext,
  useOptionalSpatialEntityStoreApi,
} from '../entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children, frameloop }: { children?: React.ReactNode; frameloop?: string }) => (
      <div data-testid="mock-canvas" data-frameloop={frameloop}>{children}</div>
    ),
  };
});

vi.mock('../ThemeTokenBridge', () => ({
  SceneTokenBridge: () => <div data-testid="mock-scene-token-bridge" />,
}));

const ChildProbe: React.FC = () => {
  const store = useOptionalSpatialEntityStoreApi();
  return <div data-testid="child-probe" data-has-store={String(Boolean(store))} />;
};

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
    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas.getAttribute('data-frameloop')).toBe('demand');
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

  it('bridges outer SpatialEntityStoreContext into Canvas children', () => {
    const store = createSpatialEntityStore();
    render(
      <SpatialEntityStoreContext.Provider value={store}>
        <StandaloneSceneShell>
          <ChildProbe />
        </StandaloneSceneShell>
      </SpatialEntityStoreContext.Provider>,
    );

    const probe = screen.getByTestId('child-probe');
    expect(probe.getAttribute('data-has-store')).toBe('true');
  });
});
