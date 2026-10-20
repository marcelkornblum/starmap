import type React from 'react';
import { Breadcrumbs, Guide3DPreview, GuideSectionNav } from '../components/domain';
import { CelestialBadge, Cluster, Datum, Heading } from '../components/interface';
import { PLANET_TYPE_GUIDE_ENTRIES } from '../services/guideService';
import styles from './GuideViews.module.css';

export const PlanetTypesListView: React.FC = () => {
  return (
    <main data-testid="planet-types-list-view-root" className={styles.guideRoot}>
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Planet Types' },
        ]}
      />
      <GuideSectionNav currentSection="planet-types" />
      <Heading as="h1">Planet Types</Heading>
      <ul data-testid="planet-types-guide-list" className={styles.cardList}>
        {PLANET_TYPE_GUIDE_ENTRIES.map((entry) => (
          <li
            key={entry.id}
            data-testid="planet-types-guide-item"
            data-planet-type={entry.id}
            className={styles.cardItem}
          >
            <a
              href={entry.href}
              data-testid="planet-types-guide-link"
              className={styles.cardLink}
            >
              <Guide3DPreview
                kind="planet"
                composition={entry.composition}
                radiusRearth={entry.canonicalRadiusRearth}
                textureTheme={entry.textureTheme}
              />
              <Cluster gap="tight" align="center">
                <CelestialBadge type={entry.composition} />
                <strong>{entry.title}</strong>
              </Cluster>
              <Datum label="Mass Range" value={entry.massRangeMearth} />
              <p>{entry.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
};
