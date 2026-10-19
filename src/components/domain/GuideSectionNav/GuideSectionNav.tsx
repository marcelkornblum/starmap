import type React from 'react';
import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
} from '../../../services/guideService';
import styles from './GuideSectionNav.module.css';

export interface GuideSectionNavProps {
  readonly currentSection?: 'star-types' | 'planet-types' | 'metrics' | 'hazards';
}

export const GuideSectionNav: React.FC<GuideSectionNavProps> = ({ currentSection }) => {
  return (
    <nav
      aria-label="Guide sections"
      data-testid="guide-section-nav"
      className={styles.sectionNav}
    >
      <ul className={styles.sectionNavList}>
        <li>
          <a
            href={STAR_TYPES_GUIDE_PATH}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'star-types' ? 'page' : undefined}
          >
            Star Types
          </a>
        </li>
        <li>
          <a
            href={PLANET_TYPES_GUIDE_PATH}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'planet-types' ? 'page' : undefined}
          >
            Planet Types
          </a>
        </li>
        <li>
          <a
            href={METRICS_GUIDE_PATH}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'metrics' ? 'page' : undefined}
          >
            Telemetry Metrics
          </a>
        </li>
        <li>
          <a
            href={HAZARDS_GUIDE_PATH}
            className={styles.sectionNavLink}
            aria-current={currentSection === 'hazards' ? 'page' : undefined}
          >
            Environmental Hazards
          </a>
        </li>
      </ul>
    </nav>
  );
};
