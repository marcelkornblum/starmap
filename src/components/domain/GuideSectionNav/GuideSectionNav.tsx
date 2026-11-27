import type React from 'react';
import { Cluster } from '../../interface';
import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
  LEGEND_GUIDE_PATH,
} from '../../../content/guide';
import { useSpaLinkClick } from '../../../hooks/spaNavigation';
import { resolveAppHref } from '../../../utils/url';
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
  const handleSpaLinkClick = useSpaLinkClick();

  return (
    <nav
      aria-label="Guide sections"
      data-testid="guide-section-nav"
      className={styles.sectionNav}
    >
      <Cluster as="ul" gap="fib-1" align="stretch">
        {GUIDE_SECTIONS.map(({ id, label, path }) => (
          <li key={id}>
            <a
              href={resolveAppHref(path)}
              className={styles.sectionNavLink}
              aria-current={currentSection === id ? 'page' : undefined}
              onClick={(e) => {
                handleSpaLinkClick(e, path);
              }}
            >
              {label}
            </a>
          </li>
        ))}
      </Cluster>
    </nav>
  );
};
