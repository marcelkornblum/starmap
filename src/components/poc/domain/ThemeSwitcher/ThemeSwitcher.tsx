import type React from 'react';
import { useSettingsStore, type ThemePalette, type UITheme } from '../../../../stores/useSettingsStore';
import {
  PALETTE_LIST,
  applyTheme,
  applyPalette,
  type ThemeMode,
} from '../../../../styles/tokens/paletteTheme';
import { Button } from '../../../interface/control/Button/Button';
import { Cluster } from '../../../interface/layout/Cluster/Cluster';
import { Stack } from '../../../interface/layout/Stack/Stack';
import styles from './ThemeSwitcher.module.css';

export interface ThemeSwitcherProps {
  compact?: boolean;
  className?: string;
  onThemeChange?: (theme: UITheme) => void;
  onPaletteChange?: (palette: ThemePalette) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  compact = false,
  className,
  onThemeChange,
  onPaletteChange,
}) => {
  const currentTheme = useSettingsStore((s) => s.theme);
  const currentPalette = useSettingsStore((s) => s.palette);

  const handleModeChange = (mode: ThemeMode) => {
    applyTheme(mode);
    onThemeChange?.(mode);
  };

  const handlePaletteChange = (palette: ThemePalette) => {
    applyPalette(palette);
    onPaletteChange?.(palette);
  };

  const isLight = currentTheme === 'light';

  const containerClasses = [
    styles.switcherCard,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (compact) {
    return (
      <Cluster gap="dense" align="center" className={className}>
        {/* Mode Segment */}
        <div className={styles.modeSegmentGroup} role="group" aria-label="Theme mode switcher">
          <Button
            size="sm"
            variant={!isLight ? 'primary' : 'default'}
            aria-pressed={!isLight}
            onClick={() => handleModeChange('dark')}
            title="Dark theme mode"
          >
            DARK
          </Button>
          <Button
            size="sm"
            variant={isLight ? 'primary' : 'default'}
            aria-pressed={isLight}
            onClick={() => handleModeChange('light')}
            title="Light theme mode"
          >
            LIGHT
          </Button>
        </div>

        {/* Palette Segment */}
        <div className={styles.paletteButtonGroup} role="radiogroup" aria-label="Palette switcher">
          {PALETTE_LIST.map((p) => {
            const isActive = currentPalette === p.id;
            return (
              <Button
                key={p.id}
                size="sm"
                variant={isActive ? 'primary' : 'default'}
                role="radio"
                aria-checked={isActive}
                title={`${p.label} - ${p.tagline}`}
                onClick={() => handlePaletteChange(p.id)}
              >
                <span className={styles.colorPip} data-palette={p.id} aria-hidden="true" />
                <span>{p.label}</span>
              </Button>
            );
          })}
        </div>
      </Cluster>
    );
  }

  return (
    <div className={containerClasses} data-testid="theme-palette-switcher">
      <Stack gap="tight">
        <Cluster justify="between" align="center">
          <span className={styles.sectionLabel}>Theme & Palette</span>
          <div className={styles.modeSegmentGroup} role="group" aria-label="Theme mode switcher">
            <Button
              size="sm"
              variant={!isLight ? 'primary' : 'default'}
              aria-pressed={!isLight}
              onClick={() => handleModeChange('dark')}
              title="Dark theme mode"
            >
              DARK
            </Button>
            <Button
              size="sm"
              variant={isLight ? 'primary' : 'default'}
              aria-pressed={isLight}
              onClick={() => handleModeChange('light')}
              title="Light theme mode"
            >
              LIGHT
            </Button>
          </div>
        </Cluster>

        <div className={styles.paletteButtonGroup} role="radiogroup" aria-label="Palette switcher">
          {PALETTE_LIST.map((p) => {
            const isActive = currentPalette === p.id;
            return (
              <Button
                key={p.id}
                size="sm"
                variant={isActive ? 'primary' : 'default'}
                role="radio"
                aria-checked={isActive}
                title={`${p.label} - ${p.tagline}`}
                onClick={() => handlePaletteChange(p.id)}
              >
                <span className={styles.colorPip} data-palette={p.id} aria-hidden="true" />
                <span>{p.label}</span>
              </Button>
            );
          })}
        </div>
      </Stack>
    </div>
  );
};
