import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeTokenSync } from './useThemeTokenSync';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useThreeTokenStore } from '../../stores/useThreeTokenStore';
import {
  registerWebGLGpuTelemetry,
  resetDeviceTierRuntimeState,
} from '../../services/deviceTierService';

describe('useThemeTokenSync', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
    useThreeTokenStore.getState().resetTokens();
    resetDeviceTierRuntimeState();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-palette');
    delete document.documentElement.dataset.deviceTier;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDeviceTierRuntimeState();
  });

  it('syncs initial data-theme, data-palette, and data-device-tier on mount', () => {
    useSettingsStore.getState().setTheme('light');
    renderHook(() => useThemeTokenSync());

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-palette')).toBe('prodigy');
    expect(['tier1', 'tier2', 'tier3']).toContain(document.documentElement.dataset.deviceTier);
    expect(useThreeTokenStore.getState().tokens.theme).toBe('light');
  });

  it('syncs subsequent useSettingsStore theme changes to documentElement without breaking direct DOM mutations', async () => {
    renderHook(() => useThemeTokenSync());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Direct DOM attribute mutation should persist and trigger token re-extraction
    const spy = vi.spyOn(window, 'getComputedStyle');
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      await Promise.resolve();
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(spy).toHaveBeenCalled();

    // Store mutation updates DOM attribute and store tokens
    act(() => {
      useSettingsStore.getState().setTheme('amoled');
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('amoled');
    expect(useThreeTokenStore.getState().tokens.theme).toBe('amoled');
  });

  it('updates data-device-tier when device tier changes and cleans up subscription on unmount', () => {
    const { unmount } = renderHook(() => useThemeTokenSync());

    act(() => {
      registerWebGLGpuTelemetry({ gpuRenderer: 'SwiftShader' });
    });
    expect(document.documentElement.dataset.deviceTier).toBe('tier1');

    unmount();
    delete document.documentElement.dataset.deviceTier;

    act(() => {
      registerWebGLGpuTelemetry({ gpuRenderer: 'Apple M3 Max', maxTextureSize: 16384 });
    });
    expect(document.documentElement.dataset.deviceTier).toBeUndefined();
  });
});
