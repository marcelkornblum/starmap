import type React from 'react';
import { Guide3DPreview } from '../components/domain/Guide3DPreview';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { SpatialShell } from '../components/domain/SpatialShell';
import { Block, CelestialSymbol, Cluster, Datum, Grid, Heading, SpectralBadge } from '../components/interface';
import { STAR_TYPE_GUIDE_ENTRIES } from '../content/guide';
import { resolveAppHref } from '../utils/url';
import styles from './GuideViews.module.css';

export const StarTypesListView: React.FC = () => {
  return (
    <SpatialShell
      mode="document"
      testId="star-types-list-view-root"
      activeWorkspace="guide"
    >
      <div className={styles.guideRoot}>
      <GuideSectionNav currentSection="star-types" />
      <Heading as="h1" size="title">Star Types</Heading>
      <Grid as="ul" minWidth="md" gap="default" data-testid="star-types-guide-list">
        {STAR_TYPE_GUIDE_ENTRIES.map((entry) => (
          <Block
            as="li"
            interactive
            padding="loose"
            key={entry.id}
            data-testid="star-types-guide-item"
            data-star-type={entry.id}
          >
            <a
              href={resolveAppHref(entry.href)}
              data-testid="star-types-guide-link"
              className={styles.cardLink}
            >
              <Guide3DPreview
                kind="star"
                spectralClass={entry.spectralClass}
                spectralLetter={entry.spectralClass === 'L/T/Y' ? 'L' : entry.spectralClass}
                radiusRsun={entry.canonicalRadiusRsun}
                chromaticityToken={entry.chromaticityToken}
              />
              <Cluster gap="tight" align="center">
                <CelestialSymbol
                  type={
                    entry.spectralClass === 'D'
                      ? 'white-dwarf'
                      : entry.spectralClass === 'L' ||
                          entry.spectralClass === 'T' ||
                          entry.spectralClass === 'Y'
                        ? 'brown-dwarf'
                        : 'star'
                  }
                  size="sm"
                  showTooltip={false}
                />
                <SpectralBadge spectralType={entry.spectralClass} interactive={false} />
                <strong>{entry.title}</strong>
              </Cluster>
              <Datum label="Effective Temp" value={entry.effectiveTempRange} />
              <p>{entry.summary}</p>
            </a>
          </Block>
        ))}
      </Grid>
      </div>
    </SpatialShell>
  );
};
