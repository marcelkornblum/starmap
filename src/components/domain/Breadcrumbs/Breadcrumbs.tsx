import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
  readonly companionHref?: string;
  readonly companionLabel?: string;
}

/**
 * Domain Component (`<Breadcrumbs>`): renders semantic breadcrumb navigation
 * at the top of a view alongside a persistent companion link (`Guide` on 3D/Map
 * views, `Map` on Guide views).
 */
export const Breadcrumbs = ({
  items,
  companionHref,
  companionLabel,
}: BreadcrumbsProps) => {
  if (items.length === 0) {
    return null;
  }

  const isGuideContext = items[0]?.label.trim().toLowerCase() === 'guide';
  const resolvedCompanionHref =
    companionHref ?? (isGuideContext ? '/galaxy' : '/guide/star-types');
  const resolvedCompanionLabel =
    companionLabel ?? (isGuideContext ? 'Map' : 'Guide');

  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="view-breadcrumbs"
      className={styles.breadcrumbsNav}
    >
      <ol data-testid="breadcrumbs-list" className={styles.breadcrumbsList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}:${index}`}
              data-testid="breadcrumb-item"
              className={styles.breadcrumbItem}
            >
              {item.href && !isLast ? (
                <a href={item.href} data-testid="breadcrumb-link">
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  data-testid="breadcrumb-current"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <a
        href={resolvedCompanionHref}
        data-testid="breadcrumbs-companion-link"
        className={styles.companionLink}
      >
        {resolvedCompanionLabel}
      </a>
    </nav>
  );
};

