import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { useState, useEffect } from 'react';
import {
  GalacticViewScene,
  SystemViewScene,
  PlanetaryViewScene,
} from './scenes/SpatialScenes';
import { CANDIDATE_SYSTEMS, SOL_PLANETS } from '../../data';
import styles from './FullAssembly.module.css';

const meta: Meta = {
  title: 'CANVAS/Assembly',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const SYSTEM_OPTIONS = CANDIDATE_SYSTEMS.slice(0, 5).map((s) => ({
  id: s.id,
  name: s.name,
}));

const PLANET_OPTIONS = SOL_PLANETS.map((p) => ({
  id: p.id,
  name: p.name,
}));

const FullCanvasAssemblyDemo: React.FC = () => {
  const [scale, setScale] = useState<'galaxy' | 'system' | 'planet'>('galaxy');
  const [systemId, setSystemId] = useState<string>('sol');
  const [planetId, setPlanetId] = useState<string>('earth');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scale === 'planet') {
          setScale('system');
        } else if (scale === 'system') {
          setScale('galaxy');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale]);

  const activeSystemName =
    CANDIDATE_SYSTEMS.find((s) => s.id === systemId)?.name ?? systemId;
  const activePlanetName =
    SOL_PLANETS.find((p) => p.id === planetId)?.name ??
    planetId.charAt(0).toUpperCase() + planetId.slice(1);

  return (
    <div className={styles.assemblyContainer}>
      <aside className={styles.hudOverlay}>
        <header className={styles.header}>
          <h1 className={styles.title}>Full Canvas Assembly</h1>
          <p className={styles.description}>
            Multi-scale spatial cartography engine. Navigate seamlessly across
            Galactic (parsec), Stellar System (AU), and Planetary (km) reference
            frames.
          </p>
        </header>

        {/* Dynamic Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Reference Frame Scale">
          <button
            type="button"
            className={`${styles.crumbButton} ${scale === 'galaxy' ? styles.crumbActive : ''}`}
            onClick={() => setScale('galaxy')}
          >
            Milky Way (pc)
          </button>
          {(scale === 'system' || scale === 'planet') && (
            <>
              <span className={styles.crumbSeparator}>›</span>
              <button
                type="button"
                className={`${styles.crumbButton} ${scale === 'system' ? styles.crumbActive : ''}`}
                onClick={() => setScale('system')}
              >
                {activeSystemName} (AU)
              </button>
            </>
          )}
          {scale === 'planet' && (
            <>
              <span className={styles.crumbSeparator}>›</span>
              <span className={`${styles.crumbButton} ${styles.crumbActive}`}>
                {activePlanetName} (km)
              </span>
            </>
          )}
        </nav>

        {/* Scale Switcher */}
        <div className={styles.controlsGroup}>
          <span className={styles.groupLabel}>Scale Tier</span>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.pillButton}
              data-active={scale === 'galaxy'}
              onClick={() => setScale('galaxy')}
            >
              Galactic (pc)
            </button>
            <button
              type="button"
              className={styles.pillButton}
              data-active={scale === 'system'}
              onClick={() => setScale('system')}
            >
              System (AU)
            </button>
            <button
              type="button"
              className={styles.pillButton}
              data-active={scale === 'planet'}
              onClick={() => setScale('planet')}
            >
              Planetary (km)
            </button>
          </div>
        </div>

        {/* System Quick-Switch */}
        {(scale === 'system' || scale === 'planet') && (
          <div className={styles.controlsGroup}>
            <span className={styles.groupLabel}>Stellar System</span>
            <div className={styles.buttonRow}>
              {SYSTEM_OPTIONS.map((sys) => (
                <button
                  key={sys.id}
                  type="button"
                  className={styles.pillButton}
                  data-active={systemId === sys.id}
                  onClick={() => setSystemId(sys.id)}
                >
                  {sys.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Planet Quick-Switch */}
        {(scale === 'system' || scale === 'planet') && (
          <div className={styles.controlsGroup}>
            <span className={styles.groupLabel}>Planetary Body</span>
            <div className={styles.buttonRow}>
              {PLANET_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.pillButton}
                  data-active={planetId === p.id && scale === 'planet'}
                  onClick={() => {
                    setPlanetId(p.id);
                    setScale('planet');
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard & Mouse Guide */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.keycap}>[2x Click]</span>
            <span>Drill In</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.keycap}>[Escape]</span>
            <span>Drill Out</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.keycap}>[Left Drag]</span>
            <span>Orbit</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.keycap}>[Wheel]</span>
            <span>Zoom</span>
          </div>
        </div>
      </aside>

      {/* 3D Scene Viewport */}
      {scale === 'galaxy' && (
        <GalacticViewScene
          variant="fullscreen"
          onInspectSystem={(sysId) => {
            setSystemId(sysId);
            setScale('system');
          }}
        />
      )}

      {scale === 'system' && (
        <SystemViewScene
          variant="fullscreen"
          systemId={systemId}
          onInspectPlanet={(pId) => {
            setPlanetId(pId);
            setScale('planet');
          }}
          onNavigateGalaxy={() => setScale('galaxy')}
        />
      )}

      {scale === 'planet' && (
        <PlanetaryViewScene
          variant="fullscreen"
          planetId={planetId}
          onNavigateSystem={() => setScale('system')}
          onNavigateGalaxy={() => setScale('galaxy')}
        />
      )}
    </div>
  );
};

export const MultiScaleNavigatorStory: StoryObj = {
  name: 'Multi-Scale Navigator',
  render: () => <FullCanvasAssemblyDemo />,
};
