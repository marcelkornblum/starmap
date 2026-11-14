import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import type { BadgeCategory, BadgeStatus } from '../Badge/Badge';
import { Tooltip } from '../../surfaces/Tooltip/Tooltip';
import { resolveAppHref } from '../../../../utils/url';
import styles from './CelestialSymbol.module.css';
import {
  type CelestialSymbolType,
  CELESTIAL_SYMBOL_META,
} from './celestialSymbolMeta';
import { renderGlyphContent } from './celestialSymbolGlyphs';

export type { CelestialSymbolType };
export { CELESTIAL_SYMBOL_META } from './celestialSymbolMeta';

export interface CelestialSymbolProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  readonly type: CelestialSymbolType;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly showTooltip?: boolean;
  readonly tooltipText?: ReactNode;
  readonly showLabel?: boolean;
  readonly href?: string;
  readonly target?: string;
  readonly rel?: string;
  readonly colored?: boolean;
  readonly category?: BadgeCategory;
  readonly status?: BadgeStatus;
  readonly 'data-testid'?: string;
  readonly children?: ReactNode;
}

export const CelestialSymbol = ({
  type,
  size = 'md',
  showTooltip = true,
  tooltipText,
  showLabel = false,
  href,
  target,
  rel,
  colored = true,
  category,
  status,
  children,
  ...rest
}: CelestialSymbolProps) => {
  const meta = CELESTIAL_SYMBOL_META[type] ?? {
    type,
    label: type,
  };

  const dataCategory =
    category !== undefined
      ? category
      : colored
        ? meta.badgeCategory
        : undefined;

  const dataStatus =
    status !== undefined
      ? status
      : colored && !meta.badgeCategory
        ? (meta.badgeStatus ?? 'neutral')
        : undefined;

  const svgNode = (
    <svg
      className={styles.glyph}
      viewBox="-12 -12 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={meta.label}
      data-celestial-symbol={meta.type}
    >
      {renderGlyphContent(meta.type)}
    </svg>
  );

  const symbolContent = href ? (
    <a
      href={resolveAppHref(href)}
      target={target}
      rel={rel}
      className={styles.symbol}
      data-interactive="true"
      data-celestial-symbol={meta.type}
      data-size={size}
      data-category={dataCategory}
      data-status={dataStatus}
      aria-label={meta.label}
      {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
    >
      {svgNode}
      {showLabel ? <span className={styles.label}>{meta.label}</span> : null}
      {children}
    </a>
  ) : (
    <span
      className={styles.symbol}
      data-celestial-symbol={meta.type}
      data-size={size}
      data-category={dataCategory}
      data-status={dataStatus}
      aria-label={meta.label}
      {...rest}
    >
      {svgNode}
      {showLabel ? <span className={styles.label}>{meta.label}</span> : null}
      {children}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip text={tooltipText ?? meta.label}>
        {symbolContent}
      </Tooltip>
    );
  }

  return symbolContent;
};
