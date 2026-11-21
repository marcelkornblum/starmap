import { describe, it, expect, vi, afterEach } from 'vitest';
import type React from 'react';
import { render, screen } from '@testing-library/react';
import { StandaloneSceneShell } from './StandaloneSceneShell';
import {
  registerWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from '../../../services/deviceTierService';
import {
  SpatialEntityStoreContext,
  useOptionalSpatialEntityStoreApi,
} from '../entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../entity/SpatialEntityStore';

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    Canvas: ({ children, frameloop, dpr }: { children?: React.ReactNode; frameloop?: string; dpr?: number }) => (
      <div data-testid="mock-canvas" data-frameloop={frameloop} data-dpr={dpr}>{children}</div>
    ),
    useFrame: vi.fn(),
    useThree: (selector?: (s: unknown) => unknown) => {
      const state = { gl: {}, setDpr: vi.fn() };
      return selector ? selector(state) : state;
    },
  };
});

vi.mock('../SceneTokenBridge', () => ({
  SceneTokenBridge: () => <div data-testid="mock-scene-token-bridge" />,
}));

const ChildProbe: React.FC = () => {
  const store = useOptionalSpatialEntityStoreApi();
  return <div data-testid="child-probe" data-has-store={String(Boolean(store))} />;
};

describe('StandaloneSceneShell Component', () => {
  afterEach(() => {
    resetDeviceTierRuntimeState();
    vi.unstubAllGlobals();
  });

  it('passes tier-aware initial DPR to Canvas based on probed capabilities', () => {
    vi.stubGlobal('navigator', { deviceMemory: 8, hardwareConcurrency: 8 });
    vi.stubGlobal('devicePixelRatio', 2);
    registerWebGLGpuTelemetry({ gpuRenderer: 'Apple M2 Max', maxTextureSize: 16384 });

    render(
      <StandaloneSceneShell>
        <div>Content</div>
      </StandaloneSceneShell>,
    );

    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas.getAttribute('data-dpr')).toBe('2');
  });

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
