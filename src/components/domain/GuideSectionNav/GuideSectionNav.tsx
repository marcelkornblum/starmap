import type React from 'react';
import { Cluster } from '../../interface';
import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  LEGEND_GUIDE_PATH,
} from '../../../content/guide';
import { resolveAppHref } from '../../../utils/url';
import styles from './GuideSectionNav.module.css';

export interface GuideSectionNavProps {
  readonly currentSection?: 'star-types' | 'planet-types' | 'metrics' | 'hazards' | 'legend';
}

export const GuideSectionNav: React.FC<GuideSectionNavProps> = ({ currentSection }) => {
  return (
    <nav
      aria-label="Guide sections"
      data-testid="guide-section-nav"
      className={styles.sectionNav}
    >
      <Cluster as="ul" gap="tight" align="center">
        <li>
          <a
            href={resolveAppHref(STAR_TYPES_GUIDE_PATH)}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'star-types' ? 'page' : undefined}
          >
            Star Types
          </a>
        </li>
        <li>
          <a
            href={resolveAppHref(PLANET_TYPES_GUIDE_PATH)}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'planet-types' ? 'page' : undefined}
          >
            Planet Types
          </a>
        </li>
        <li>
          <a
            href={resolveAppHref(METRICS_GUIDE_PATH)}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'metrics' ? 'page' : undefined}
          >
            Telemetry Metrics
          </a>
        </li>
        <li>
          <a
            href={resolveAppHref(HAZARDS_GUIDE_PATH)}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'hazards' ? 'page' : undefined}
          >
            Environmental Hazards
          </a>
        </li>
        <li>
          <a
            href={resolveAppHref(LEGEND_GUIDE_PATH)}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'legend' ? 'page' : undefined}
          >
            Legend
          </a>
        </li>
      </Cluster>
    </nav>
  );
};
