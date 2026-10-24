import React, { useState } from 'react';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { Button, Heading, Input, Kbd, Slider, Toggle } from '../../interface';
import styles from './ControlBar.module.css';

export interface ControlBarProps {
  readonly scope: 'galaxy' | 'system' | 'planet';
}

const SHORTCUTS = [
  { key: '/', label: 'Search' },
  { key: 'Space', label: 'Play/Pause' },
  { key: 'R', label: 'Reset View' },
  { key: 'Esc', label: 'Clear Focus' },
];

export const ControlBar: React.FC<ControlBarProps> = ({ scope }) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeSpeed, setTimeSpeed] = useState<number>(1);
  const [dateTime, setDateTime] = useState<string>('2000-01-01T12:00');

  const projection = useSettingsStore((s) => s.projection);
  const setProjection = useSettingsStore((s) => s.setProjection);
  const showOrbits = useSettingsStore((s) => s.showOrbits);
  const toggleOrbits = useSettingsStore((s) => s.toggleOrbits);
  const showGrid = useSettingsStore((s) => s.showGrid);
  const toggleGrid = useSettingsStore((s) => s.toggleGrid);
  const showLabels = useSettingsStore((s) => s.showLabels);
  const toggleLabels = useSettingsStore((s) => s.toggleLabels);

  return (
    <section
      className={styles.controlBar}
      aria-labelledby="control-bar-heading"
      data-testid="control-bar"
      data-scope={scope}
      data-mobile-expanded={isMobileExpanded ? 'true' : 'false'}
    >
      <Heading as="h2" id="control-bar-heading" className={styles.srOnly}>
        Controls
      </Heading>

      <Button
        className={styles.mobileToggle}
        data-testid="control-bar-mobile-toggle"
        aria-expanded={isMobileExpanded}
        aria-label={isMobileExpanded ? 'Minimise controls' : 'Expand controls'}
        onClick={() => setIsMobileExpanded((exp) => !exp)}
      >
        {isMobileExpanded ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        )}
      </Button>

      <div
        className={styles.timeController}
        data-testid="control-bar-time-controller"
      >
        <Button
          size="sm"
          variant={isPlaying ? 'primary' : 'subtle'}
          data-testid="control-bar-play-pause"
          aria-pressed={isPlaying}
          onClick={() => setIsPlaying((p) => !p)}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Slider
          min={0}
          max={100}
          value={timeSpeed}
          onChange={setTimeSpeed}
          aria-label="Simulation speed scrubber"
          data-testid="control-bar-time-scrubber"
        />
        <Input
          type="datetime-local"
          sizeVariant="sm"
          tabular
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          aria-label="Simulation date and time"
          data-testid="control-bar-datetime-picker"
        />
      </div>

      <div className={styles.modeGroup} data-testid="control-bar-mode-group">
        <Button
          size="sm"
          variant={projection === '3d' ? 'primary' : 'subtle'}
          data-testid="control-bar-projection-3d"
          aria-pressed={projection === '3d'}
          onClick={() => setProjection('3d')}
        >
          3D
        </Button>
        <Button
          size="sm"
          variant={projection === 'top-down' ? 'primary' : 'subtle'}
          data-testid="control-bar-projection-top-down"
          aria-pressed={projection === 'top-down'}
          onClick={() => setProjection('top-down')}
        >
          Top-Down
        </Button>
        <Toggle
          checked={showOrbits}
          onChange={() => toggleOrbits()}
          label="Orbits"
          data-testid="control-bar-toggle-orbits"
        />
        <Toggle
          checked={showGrid}
          onChange={() => toggleGrid()}
          label="Grid"
          data-testid="control-bar-toggle-grid"
        />
        <Toggle
          checked={showLabels}
          onChange={() => toggleLabels()}
          label="Labels"
          data-testid="control-bar-toggle-labels"
        />
      </div>

      <ul
        className={styles.shortcutsList}
        data-testid="control-bar-shortcuts-list"
      >
        {SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.key}
            className={styles.shortcutItem}
            data-testid="control-bar-shortcut-item"
          >
            <Kbd>{shortcut.key}</Kbd>
            <span>{shortcut.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
