import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { ThemeTokenBridge, SceneTokenBridge } from './ThemeTokenBridge';
import { useThreeTokenStore } from '../../stores/useThreeTokenStore';

const mockSetClearColor = vi.fn();

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({
    gl: { setClearColor: mockSetClearColor },
  }),
}));

vi.mock('./useThemeTokenSync', () => ({
  useThemeTokenSync: vi.fn(),
}));

describe('ThemeTokenBridge', () => {
  it('renders ThemeTokenBridge without throwing and returns null', () => {
    const { container } = render(<ThemeTokenBridge />);
    expect(container.firstChild).toBeNull();
  });

  it('runs SceneTokenBridge with transparent=true and sets transparent clear color', () => {
    renderHook(() => SceneTokenBridge({ transparent: true }));
    expect(mockSetClearColor).toHaveBeenCalledWith(0x000000, 0);
  });

  it('runs SceneTokenBridge with transparent=false and updates clear color from store', () => {
    act(() => {
      useThreeTokenStore.getState().setTokens({
        ...useThreeTokenStore.getState().tokens,
        canvasBg: '#112233',
        canvasOpacity: 0.9,
      });
    });

    const { result } = renderHook(() => SceneTokenBridge({ transparent: false }));
    expect(mockSetClearColor).toHaveBeenCalledWith('#112233', 0.9);
    expect(result.current).not.toBeNull();
  });
});
