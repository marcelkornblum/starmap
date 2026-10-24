import type { ReactNode } from 'react';
import type { FocusedCanonAnnotation } from '../../../services/details/types';
import { buildLayerGalaxyHref } from '../../../services/searchService';
import { Badge } from '../../interface';
import styles from './CanonLayerItem.module.css';

export interface CanonLayerItemProps {
  readonly annotation: FocusedCanonAnnotation;
  readonly as?: 'li' | 'div';
  readonly className?: string;
}

/**
 * Domain component rendering a tightened canon layer annotation in DetailsPanel (DEC-041).
 * Features:
 * - Direct activation link on the canon title opening LayerCard.
 * - Subtitle rendered without brackets in muted typography.
 * - Layer badge on the right for quick layer overview navigation.
 * - No accordion or duplicate layer prefix.
 */
export const CanonLayerItem = ({
  annotation,
  as = 'li',
  className,
}: CanonLayerItemProps): ReactNode => {
  const Component = as;
  const title =
    annotation.inUniverseName ||
    annotation.resolvedName ||
    annotation.targetId;

  const badgeHref =
    annotation.layerHref || buildLayerGalaxyHref(annotation.layerId);

  return (
    <Component
      className={`${styles.item} ${className ?? ''}`.trim()}
      data-testid="details-canon-item"
      data-layer-id={annotation.layerId}
      data-layer-kind={annotation.kind}
      data-target-id={annotation.targetId}
    >
      <div className={styles.content}>
        {annotation.href ? (
          <a
            href={annotation.href}
            className={styles.titleLink}
            data-testid="details-canon-item-link"
          >
            <strong
              className={styles.title}
              data-testid="details-canon-item-title"
            >
              {title}
            </strong>
          </a>
        ) : (
          <strong
            className={styles.title}
            data-testid="details-canon-item-title"
          >
            {title}
          </strong>
        )}
        {annotation.subtitle ? (
          <span
            className={styles.subtitle}
            data-testid="details-canon-item-subtitle"
          >
            {annotation.subtitle}
          </span>
        ) : null}
      </div>
      <div className={styles.badgeWrapper}>
        <Badge
          status={annotation.kind === 'scientific-overlay' ? 'info' : 'neutral'}
          href={badgeHref}
          data-testid="details-canon-link"
        >
          {annotation.layerTitle}
        </Badge>
      </div>
    </Component>
  );
};
