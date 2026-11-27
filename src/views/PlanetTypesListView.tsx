import type React from 'react';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { Guide3DPreview } from '../components/domain/Guide3DPreview';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { SpatialShell } from '../components/domain/SpatialShell';
import { Block, CelestialBadge, Cluster, Datum, Grid, Heading } from '../components/interface';
import { PLANET_TYPE_GUIDE_ENTRIES } from '../content/guide';
import { resolveAppHref } from '../utils/url';
import styles from './GuideViews.module.css';

export const PlanetTypesListView: React.FC = () => {
  return (
    <SpatialShell
      mode="document"
      testId="planet-types-list-view-root"
      activeWorkspace="guide"
    >
      <div className={styles.guideRoot}>
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Planet Types' },
        ]}
      />
      <GuideSectionNav currentSection="planet-types" />
      <Heading as="h1">Planet Types</Heading>
      <Grid as="ul" minWidth="md" gap="default" data-testid="planet-types-guide-list">
        {PLANET_TYPE_GUIDE_ENTRIES.map((entry) => (
          <Block
            as="li"
            interactive
            padding="loose"
            key={entry.id}
            data-testid="planet-types-guide-item"
            data-planet-type={entry.id}
          >
            <a
              href={resolveAppHref(entry.href)}
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
          </Block>
        ))}
      </Grid>
      </div>
    </SpatialShell>
  );
};
