import { memo } from 'react';
import {
  CelestialTitle,
  Cluster,
  type CelestialSymbolType,
} from '../../interface';
import { resolveAppHref } from '../../../utils/url';
import { useSpaLinkClick } from '../../../hooks/spaNavigation';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
  readonly reticleType?: CelestialSymbolType;
}

export interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
}

/**
 * Domain Component (`<Breadcrumbs>`): renders semantic breadcrumb navigation
 * at the top of a view.
 */
export const Breadcrumbs = memo(({
  items,
}: BreadcrumbsProps) => {
  const handleSpaLinkClick = useSpaLinkClick();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="view-breadcrumbs"
      className={styles.breadcrumbsNav}
    >
      <Cluster as="ol" gap="tight" align="center" data-testid="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const resolvedReticle = item.reticleType;

          const itemContent = resolvedReticle ? (
            <CelestialTitle
              type={resolvedReticle}
              title={item.label}
              size="sm"
              showTooltip={false}
            />
          ) : (
            item.label
          );

          return (
            <li
              key={`${item.label}:${index}`}
              data-testid="breadcrumb-item"
              className={styles.breadcrumbItem}
            >
              {item.href && !isLast ? (
                <a
                  href={resolveAppHref(item.href)}
                  data-testid="breadcrumb-link"
                  onClick={(e) => handleSpaLinkClick(e, item.href)}
                >
                  {itemContent}
                </a>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  data-testid="breadcrumb-current"
                >
                  {itemContent}
                </span>
              )}
            </li>
          );
        })}
      </Cluster>
    </nav>
  );
});
