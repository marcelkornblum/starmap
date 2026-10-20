import type React from 'react';
import { Breadcrumbs, Guide3DPreview, GuideSectionNav } from '../components/domain';
import { Cluster, Datum, Heading, SpectralBadge } from '../components/interface';
import { STAR_TYPE_GUIDE_ENTRIES } from '../services/guideService';
import styles from './GuideViews.module.css';

export const StarTypesListView: React.FC = () => {
  return (
    <main data-testid="star-types-list-view-root" className={styles.guideRoot}>
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide/star-types' },
          { label: 'Star Types' },
        ]}
      />
      <GuideSectionNav currentSection="star-types" />
      <Heading as="h1">Star Types</Heading>
      <ul data-testid="star-types-guide-list" className={styles.cardList}>
        {STAR_TYPE_GUIDE_ENTRIES.map((entry) => (
          <li
            key={entry.id}
            data-testid="star-types-guide-item"
            data-star-type={entry.id}
            className={styles.cardItem}
          >
            <a
              href={entry.href}
              data-testid="star-types-guide-link"
              className={styles.cardLink}
            >
              <Guide3DPreview
                kind="star"
                spectralClass={entry.spectralClass}
                radiusRsun={entry.canonicalRadiusRsun}
                tempK={entry.canonicalTempK}
                chromaticityHex={entry.chromaticityHex}
              />
              <Cluster gap="tight" align="center">
                <SpectralBadge spectralType={entry.spectralClass} interactive={false} />
                <strong>{entry.title}</strong>
              </Cluster>
              <Datum label="Effective Temp" value={entry.effectiveTempRange} />
              <p>{entry.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
};
