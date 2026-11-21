import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { ThemeTokenBridge } from './ThemeTokenBridge';
import { SceneTokenBridge } from './SceneTokenBridge';
import { useThreeTokenStore } from '../../stores/useThreeTokenStore';

const mockSetClearColor = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@react-three/fiber', () => ({
  useThree: (selector?: (s: unknown) => unknown) => {
    const state = {
      gl: { setClearColor: mockSetClearColor },
      invalidate: mockInvalidate,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('./useThemeTokenSync', () => ({
  useThemeTokenSync: vi.fn(),
}));

describe('ThemeTokenBridge', () => {
  beforeEach(() => {
    mockSetClearColor.mockClear();
    mockInvalidate.mockClear();
  });

  it('renders ThemeTokenBridge without throwing and returns null', () => {
    const { container } = render(<ThemeTokenBridge />);
    expect(container.firstChild).toBeNull();
  });

  it('runs SceneTokenBridge with transparent=true and sets transparent clear color and invalidates', () => {
    renderHook(() => SceneTokenBridge({ transparent: true }));
    expect(mockSetClearColor).toHaveBeenCalledWith(0x000000, 0);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it('runs SceneTokenBridge with transparent=false and updates clear color from store and invalidates', () => {
    act(() => {
      useThreeTokenStore.getState().setTokens({
        ...useThreeTokenStore.getState().tokens,
        canvasBg: '#112233',
        canvasOpacity: 0.9,
      });
    });

    const { result } = renderHook(() => SceneTokenBridge({ transparent: false }));
    expect(mockSetClearColor).toHaveBeenCalledWith('#112233', 0.9);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(result.current).not.toBeNull();
  });
});
