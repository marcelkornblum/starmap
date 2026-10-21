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
      <Heading as="h2" id="control-bar-heading" className={styles.srOnly}>
        Controls
      </Heading>

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
