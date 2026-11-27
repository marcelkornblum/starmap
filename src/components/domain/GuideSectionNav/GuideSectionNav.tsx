import type React from 'react';
import { useEffect } from 'react';
import { Button, Cluster } from '../../interface';
import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  LEGEND_GUIDE_PATH,
} from '../../../content/guide';
import { preloadGuideListViews } from '../../../services/navigation/guidePreloader';
import styles from './GuideSectionNav.module.css';

export type GuideSectionId = 'star-types' | 'planet-types' | 'metrics' | 'hazards' | 'legend';

export interface GuideSectionNavProps {
  readonly currentSection?: GuideSectionId;
}

const GUIDE_SECTIONS: readonly {
  readonly id: GuideSectionId;
  readonly label: string;
  readonly path: string;
}[] = [
  { id: 'star-types', label: 'Star Types', path: STAR_TYPES_GUIDE_PATH },
  { id: 'planet-types', label: 'Planet Types', path: PLANET_TYPES_GUIDE_PATH },
  { id: 'metrics', label: 'Telemetry Metrics', path: METRICS_GUIDE_PATH },
  { id: 'hazards', label: 'Environmental Hazards', path: HAZARDS_GUIDE_PATH },
  { id: 'legend', label: 'Legend', path: LEGEND_GUIDE_PATH },
];

export const GuideSectionNav: React.FC<GuideSectionNavProps> = ({ currentSection }) => {
  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      return;
    }
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        void preloadGuideListViews();
      });
      return () => {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId);
        }
      };
    }
    const timerId = globalThis.setTimeout(() => {
      void preloadGuideListViews();
    }, 120);
    return () => {
      globalThis.clearTimeout(timerId);
    };
  }, []);

  return (
    <nav
      aria-label="Guide sections"
      data-testid="guide-section-nav"
      className={styles.sectionNav}
    >
      <Cluster as="ul" gap="fib-1" align="center">
        {GUIDE_SECTIONS.map(({ id, label, path }) => {
          const isCurrent = currentSection === id;
          return (
            <li key={id}>
              <Button
                href={path}
                size="sm"
                variant={isCurrent ? 'primary' : 'subtle'}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {label}
              </Button>
            </li>
          );
        })}
      </Cluster>
    </nav>
  );
};
