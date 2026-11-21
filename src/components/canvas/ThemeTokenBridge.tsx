import type React from 'react';
import { useThemeTokenSync } from './useThemeTokenSync';

/**
 * DOM-side synchronization bridge component.
 * Mount inside the application shell or Storybook decorator.
 */
export const ThemeTokenBridge: React.FC = () => {
  useThemeTokenSync();
  return null;
};
