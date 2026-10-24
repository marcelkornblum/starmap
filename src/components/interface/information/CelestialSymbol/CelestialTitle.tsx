import {
  createElement,
  type FC,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import { CelestialBadge } from './CelestialBadge';
import type { CelestialSymbolType } from './CelestialSymbol';
import styles from './CelestialTitle.module.css';

export interface CelestialTitleProps {
  readonly type: CelestialSymbolType;
  readonly title: ReactNode;
  readonly href?: string;
  readonly as?: 'span' | 'strong' | 'h1' | 'h2' | 'h3' | 'h4';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly symbolHref?: string;
  readonly symbolTestId?: string;
  readonly titleTestId?: string;
  readonly showTooltip?: boolean;
  readonly className?: string;
  readonly 'data-testid'?: string;
  readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
  readonly target?: string;
  readonly rel?: string;
}

export const CelestialTitle: FC<CelestialTitleProps> = ({
  type,
  title,
  href,
  as = 'span',
  size = 'sm',
  symbolHref,
  symbolTestId,
  titleTestId,
  showTooltip = true,
  className,
  'data-testid': dataTestId,
  onClick,
  target,
  rel,
}) => {
  const wrapperClass = className
    ? `${styles.celestialTitle} ${className}`
    : styles.celestialTitle;

  const badgeProps = {
    type,
    size,
    href: symbolHref,
    'data-testid': symbolTestId,
    ...(showTooltip !== undefined ? ({ showTooltip } as Record<string, unknown>) : {}),
  };

  const badgeElement = <CelestialBadge {...badgeProps} />;

  let titleElement: ReactNode;
  if (href) {
    const link = (
      <a
        href={href}
        className={styles.titleLink}
        data-testid={titleTestId}
        onClick={onClick}
        target={target}
        rel={rel}
      >
        {title}
      </a>
    );

    titleElement = as && as !== 'span' ? (
      createElement(as, { className: styles.title }, link)
    ) : (
      link
    );
  } else {
    const Tag = as ?? 'span';
    titleElement = createElement(
      Tag,
      {
        className: styles.title,
        'data-testid': titleTestId,
      },
      title,
    );
  }

  return (
    <span
      className={wrapperClass}
      data-celestial-title={type}
      data-testid={dataTestId}
    >
      {badgeElement}
      {titleElement}
    </span>
  );
};
