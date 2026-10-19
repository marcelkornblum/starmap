import type React from 'react';
import { Breadcrumbs, Guide3DPreview, GuideSectionNav } from '../components/domain';
import { Badge } from '../components/interface';
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
      <h1>Star Types</h1>
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
              <div>
                <Badge category="star">{entry.spectralClass}</Badge>{' '}
                <strong>{entry.title}</strong>
              </div>
              <div>
                <span>{entry.effectiveTempRange}</span>
              </div>
              <p>{entry.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
};
