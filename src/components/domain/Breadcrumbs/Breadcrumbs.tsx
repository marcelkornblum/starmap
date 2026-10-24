import { Button, CelestialTitle, type CelestialSymbolType } from '../../interface';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
  readonly reticleType?: CelestialSymbolType;
}

export interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
  readonly companionHref?: string;
  readonly companionLabel?: string;
}

/**
 * Domain Component (`<Breadcrumbs>`): renders semantic breadcrumb navigation
 * at the top of a view alongside a persistent mode menu (Galaxy and Guide)
 * showing the active screen.
 */
export const Breadcrumbs = ({
  items,
  companionHref,
  companionLabel: _companionLabel,
}: BreadcrumbsProps) => {
  if (items.length === 0) {
    return null;
  }

  const isGuideContext = items[0]?.label.trim().toLowerCase() === 'guide';
  const resolvedGalaxyHref =
    isGuideContext && companionHref ? companionHref : '/galaxy';
  const resolvedGuideHref =
    !isGuideContext && companionHref ? companionHref : '/guide/star-types';

  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="view-breadcrumbs"
      className={styles.breadcrumbsNav}
    >
      <ol data-testid="breadcrumbs-list" className={styles.breadcrumbsList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isGalaxyContext = items[0]?.label.trim().toLowerCase() === 'galaxy';
          const resolvedReticle =
            item.reticleType ??
            (isGalaxyContext && index >= 1
              ? index === 1
                ? 'stellar-system'
                : 'terrestrial'
              : undefined);

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
                <a href={item.href} data-testid="breadcrumb-link">
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
      </ol>
      <div
        className={styles.modeMenu}
        role="navigation"
        aria-label="Primary mode"
        data-testid="breadcrumbs-mode-menu"
      >
        <Button
          href={resolvedGalaxyHref}
          size="sm"
          variant={isGuideContext ? 'subtle' : 'primary'}
          aria-current={!isGuideContext ? 'page' : undefined}
          data-active={!isGuideContext ? 'true' : undefined}
          data-testid={isGuideContext ? 'breadcrumbs-companion-link' : 'breadcrumbs-mode-galaxy'}
          className={styles.modeButton}
        >
          Galaxy
        </Button>
        <Button
          href={resolvedGuideHref}
          size="sm"
          variant={isGuideContext ? 'primary' : 'subtle'}
          aria-current={isGuideContext ? 'page' : undefined}
          data-active={isGuideContext ? 'true' : undefined}
          data-testid={!isGuideContext ? 'breadcrumbs-companion-link' : 'breadcrumbs-mode-guide'}
          className={styles.modeButton}
        >
          Guide
        </Button>
      </div>
    </nav>
  );
};

