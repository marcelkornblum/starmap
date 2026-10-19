import React, { useState } from 'react';
import { useSettingsStore } from '../../../stores/useSettingsStore';
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
    >
      <h2 id="control-bar-heading">Controls</h2>

      <div
        className={styles.timeController}
        data-testid="control-bar-time-controller"
      >
        <button
          type="button"
          data-testid="control-bar-play-pause"
          aria-pressed={isPlaying}
          onClick={() => setIsPlaying((p) => !p)}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={timeSpeed}
          onChange={(e) => setTimeSpeed(Number(e.target.value))}
          aria-label="Simulation speed scrubber"
          data-testid="control-bar-time-scrubber"
        />
        <input
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          aria-label="Simulation date and time"
          data-testid="control-bar-datetime-picker"
        />
      </div>

      <div className={styles.modeGroup} data-testid="control-bar-mode-group">
        <button
          type="button"
          data-testid="control-bar-projection-3d"
          aria-pressed={projection === '3d'}
          onClick={() => setProjection('3d')}
        >
          3D
        </button>
        <button
          type="button"
          data-testid="control-bar-projection-top-down"
          aria-pressed={projection === 'top-down'}
          onClick={() => setProjection('top-down')}
        >
          Top-Down
        </button>
        <button
          type="button"
          data-testid="control-bar-toggle-orbits"
          aria-pressed={showOrbits}
          onClick={toggleOrbits}
        >
          Orbits
        </button>
        <button
          type="button"
          data-testid="control-bar-toggle-grid"
          aria-pressed={showGrid}
          onClick={toggleGrid}
        >
          Grid
        </button>
        <button
          type="button"
          data-testid="control-bar-toggle-labels"
          aria-pressed={showLabels}
          onClick={toggleLabels}
        >
          Labels
        </button>
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
            <kbd className={styles.kbd}>{shortcut.key}</kbd>
            <span>{shortcut.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
