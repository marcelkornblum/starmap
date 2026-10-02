import { useState, type HTMLAttributes } from 'react';
import { Stack, Cluster, Button, Toggle, Slider } from '../../primitives';
import { useSettingsStore, type ProjectionMode } from '../../../stores/useSettingsStore';
import styles from './SystemControls.module.css';

export interface SystemControlsProps extends HTMLAttributes<HTMLDivElement> {
  timeSpeed?: number;
  onTimeSpeedChange?: (speed: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  showOrbits?: boolean;
  onToggleOrbits?: (show: boolean) => void;
  showGrid?: boolean;
  onToggleGrid?: (show: boolean) => void;
  showLabels?: boolean;
  onToggleLabels?: (show: boolean) => void;
  projection?: ProjectionMode;
  onProjectionChange?: (mode: ProjectionMode) => void;
  onResetView?: () => void;
}

export const SystemControls = ({
  timeSpeed: propTimeSpeed,
  onTimeSpeedChange,
  isPlaying: propIsPlaying,
  onTogglePlay,
  showOrbits: propShowOrbits,
  onToggleOrbits,
  showGrid: propShowGrid,
  onToggleGrid,
  showLabels: propShowLabels,
  onToggleLabels,
  projection: propProjection,
  onProjectionChange,
  onResetView,
  className,
  ...rest
}: SystemControlsProps) => {
  // Store fallback hooks
  const storeShowOrbits = useSettingsStore((s) => s.showOrbits);
  const storeSetShowOrbits = useSettingsStore((s) => s.setShowOrbits);
  const storeShowGrid = useSettingsStore((s) => s.showGrid);
  const storeSetShowGrid = useSettingsStore((s) => s.setShowGrid);
  const storeShowLabels = useSettingsStore((s) => s.showLabels);
  const storeSetShowLabels = useSettingsStore((s) => s.setShowLabels);
  const storeProjection = useSettingsStore((s) => s.projection);
  const storeSetProjection = useSettingsStore((s) => s.setProjection);

  // Local state for time speed and play state if not controlled externally
  const [localTimeSpeed, setLocalTimeSpeed] = useState(1);
  const [localIsPlaying, setLocalIsPlaying] = useState(true);

  const effectiveTimeSpeed = propTimeSpeed ?? localTimeSpeed;
  const setTimeSpeed = onTimeSpeedChange ?? setLocalTimeSpeed;

  const effectiveIsPlaying = propIsPlaying ?? localIsPlaying;
  const togglePlay = onTogglePlay ?? (() => setLocalIsPlaying((prev) => !prev));

  const effectiveShowOrbits = propShowOrbits ?? storeShowOrbits;
  const handleToggleOrbits = onToggleOrbits ?? storeSetShowOrbits;

  const effectiveShowGrid = propShowGrid ?? storeShowGrid;
  const handleToggleGrid = onToggleGrid ?? storeSetShowGrid;

  const effectiveShowLabels = propShowLabels ?? storeShowLabels;
  const handleToggleLabels = onToggleLabels ?? storeSetShowLabels;

  const effectiveProjection = propProjection ?? storeProjection;
  const handleProjectionChange = onProjectionChange ?? storeSetProjection;

  const combinedClassName = className
    ? `${styles.controlsDock} ${className}`
    : styles.controlsDock;

  return (
    <div className={combinedClassName} {...rest}>
      <Stack gap="default">
        <Cluster gap="default" justify="between" align="center">
          <Cluster gap="tight" align="center">
            <Button
              variant={effectiveIsPlaying ? 'primary' : 'secondary'}
              size="sm"
              onClick={togglePlay}
              aria-label={effectiveIsPlaying ? 'Pause simulation' : 'Play simulation'}
            >
              {effectiveIsPlaying ? '⏸ Pause' : '▶ Play'}
            </Button>
            <div className={styles.sliderWrapper}>
              <Slider
                min={0}
                max={100}
                step={1}
                value={effectiveTimeSpeed}
                onChange={setTimeSpeed}
                label="Warp"
                aria-label="Simulation speed warp"
              />
            </div>
          </Cluster>

          <Cluster gap="tight" align="center">
            <div className={styles.buttonGroup} role="group" aria-label="Projection mode">
              <Button
                variant={effectiveProjection === '3d' ? 'primary' : 'subtle'}
                size="sm"
                className={styles.groupButton}
                onClick={() => handleProjectionChange('3d')}
              >
                3D
              </Button>
              <Button
                variant={effectiveProjection === 'top-down' ? 'primary' : 'subtle'}
                size="sm"
                className={styles.groupButton}
                onClick={() => handleProjectionChange('top-down')}
              >
                Top-Down
              </Button>
            </div>

            {onResetView && (
              <Button variant="subtle" size="sm" onClick={onResetView}>
                Reset View
              </Button>
            )}
          </Cluster>
        </Cluster>

        <Cluster gap="loose" align="center">
          <Toggle
            checked={effectiveShowOrbits}
            onChange={handleToggleOrbits}
            label="Orbits"
          />
          <Toggle
            checked={effectiveShowGrid}
            onChange={handleToggleGrid}
            label="Grid"
          />
          <Toggle
            checked={effectiveShowLabels}
            onChange={handleToggleLabels}
            label="Labels"
          />
        </Cluster>
      </Stack>
    </div>
  );
};
