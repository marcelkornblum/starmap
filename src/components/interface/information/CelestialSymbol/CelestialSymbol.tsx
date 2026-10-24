import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import type { BadgeCategory, BadgeStatus } from '../Badge/Badge';
import { Tooltip } from '../../surfaces/Tooltip/Tooltip';
import styles from './CelestialSymbol.module.css';

export type CelestialSymbolType =
  // Group A: 3D Reticle & Planetary Taxonomy
  | 'star'
  | 'stellar-system'
  | 'brown-dwarf'
  | 'white-dwarf'
  | 'neutron-star'
  | 'hazard'
  | 'black-hole'
  | 'barycentre'
  | 'stellar-cluster'
  | 'construct'
  | 'terrestrial'
  | 'super-earth'
  | 'gas-giant'
  | 'ice-giant'
  // Group B: Sub-Planetary, Disk, Structure, & Environmental Taxonomy
  | 'dwarf-planet'
  | 'moon'
  | 'asteroid'
  | 'comet'
  | 'belt'
  | 'asteroid-belt'
  | 'kuiper-belt'
  | 'debris-disk'
  | 'nebula'
  | 'ism'
  | 'supernova-remnant'
  | 'habitable-zone';

export interface CelestialSymbolMetadata {
  readonly type: CelestialSymbolType;
  readonly label: string;
  readonly badgeCategory?: BadgeCategory;
  readonly badgeStatus?: BadgeStatus;
  readonly defaultGuideHref?: string;
}

export const CELESTIAL_SYMBOL_META: Record<CelestialSymbolType, CelestialSymbolMetadata> = {
  // Group A: 3D Reticle & Planetary Taxonomy
  'star': {
    type: 'star',
    label: 'Star',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types',
  },
  'stellar-system': {
    type: 'stellar-system',
    label: 'Stellar System',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types',
  },
  'brown-dwarf': {
    type: 'brown-dwarf',
    label: 'Brown Dwarf',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types/L-T-Y',
  },
  'white-dwarf': {
    type: 'white-dwarf',
    label: 'White Dwarf',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/star-types/D',
  },
  'neutron-star': {
    type: 'neutron-star',
    label: 'Neutron Star',
    badgeStatus: 'critical',
    defaultGuideHref: '/guide/hazards/ionising-radiation',
  },
  'hazard': {
    type: 'hazard',
    label: 'Relativistic Hazard',
    badgeStatus: 'critical',
    defaultGuideHref: '/guide/hazards',
  },
  'black-hole': {
    type: 'black-hole',
    label: 'Black Hole',
    badgeStatus: 'critical',
    defaultGuideHref: '/guide/hazards',
  },
  'barycentre': {
    type: 'barycentre',
    label: 'Barycentre',
    badgeStatus: 'neutral',
  },
  'stellar-cluster': {
    type: 'stellar-cluster',
    label: 'Stellar Cluster',
    badgeCategory: 'constellation',
  },
  'construct': {
    type: 'construct',
    label: 'Artificial Construct',
    badgeStatus: 'info',
  },
  'terrestrial': {
    type: 'terrestrial',
    label: 'Terrestrial',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/terrestrial',
  },
  'super-earth': {
    type: 'super-earth',
    label: 'Super-Earth',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/super-earth',
  },
  'gas-giant': {
    type: 'gas-giant',
    label: 'Gas Giant',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/gas-giant',
  },
  'ice-giant': {
    type: 'ice-giant',
    label: 'Ice Giant',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/ice-giant',
  },

  // Group B: Sub-Planetary, Disk, Structure, & Environmental Taxonomy
  'dwarf-planet': {
    type: 'dwarf-planet',
    label: 'Dwarf Planet',
    badgeCategory: 'planet',
    defaultGuideHref: '/guide/planet-types/terrestrial',
  },
  'moon': {
    type: 'moon',
    label: 'Moon',
    badgeStatus: 'neutral',
  },
  'asteroid': {
    type: 'asteroid',
    label: 'Asteroid',
    badgeStatus: 'neutral',
  },
  'comet': {
    type: 'comet',
    label: 'Comet',
    badgeStatus: 'info',
  },
  'belt': {
    type: 'belt',
    label: 'Circumstellar Belt',
    badgeStatus: 'neutral',
  },
  'asteroid-belt': {
    type: 'asteroid-belt',
    label: 'Asteroid Belt',
    badgeStatus: 'caution',
    defaultGuideHref: '/guide/planet-types/terrestrial',
  },
  'kuiper-belt': {
    type: 'kuiper-belt',
    label: 'Kuiper Belt',
    badgeStatus: 'info',
    defaultGuideHref: '/guide/planet-types/ice-giant',
  },
  'debris-disk': {
    type: 'debris-disk',
    label: 'Debris Disk',
    badgeStatus: 'neutral',
    defaultGuideHref: '/guide/metrics/semi-major-axis',
  },
  'nebula': {
    type: 'nebula',
    label: 'Nebula',
    badgeCategory: 'nebula',
  },
  'ism': {
    type: 'ism',
    label: 'Interstellar Cloud',
    badgeCategory: 'nebula',
  },
  'supernova-remnant': {
    type: 'supernova-remnant',
    label: 'Supernova Remnant',
    badgeCategory: 'nebula',
  },
  'habitable-zone': {
    type: 'habitable-zone',
    label: 'Habitable Zone',
    badgeStatus: 'nominal',
    defaultGuideHref: '/guide/planet-types/habitable-zone',
  },
};

export interface CelestialSymbolProps extends HTMLAttributes<HTMLElement> {
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

const renderGlyphContent = (type: CelestialSymbolType): ReactNode => {
  switch (type) {
    case 'star':
    case 'stellar-system':
      return <path d="M 0 -9 L 9 0 L 0 9 L -9 0 Z" />;

    case 'brown-dwarf':
      return <path d="M -5.5 -3.5 L 0 -9 L 5.5 -3.5 M -5.5 3.5 L 0 9 L 5.5 3.5" />;

    case 'white-dwarf':
      return (
        <path d="M -3.2 -5.8 L 0 -9 L 3.2 -5.8 M 5.8 -3.2 L 9 0 L 5.8 3.2 M 3.2 5.8 L 0 9 L -3.2 5.8 M -5.8 3.2 L -9 0 L -5.8 -3.2" />
      );

    case 'neutron-star':
    case 'hazard':
      return (
        <path d="M -3.2 -5.8 L 0 -9 L 3.2 -5.8 M 5.8 -3.2 L 9 0 L 5.8 3.2 M 3.2 5.8 L 0 9 L -3.2 5.8 M -5.8 3.2 L -9 0 L -5.8 -3.2 M 0 -6.5 L 0 -10.8 M 0 6.5 L 0 10.8 M -6.5 0 L -10.8 0 M 6.5 0 L 10.8 0" />
      );

    case 'black-hole':
      return (
        <path d="M -9.5 0 L -2.5 0 M -4.5 -1.8 L -2.5 0 L -4.5 1.8 M 9.5 0 L 2.5 0 M 4.5 -1.8 L 2.5 0 L 4.5 1.8 M 0 -9.5 L 0 -2.5 M -1.8 -4.5 L 0 -2.5 L 1.8 -4.5 M 0 9.5 L 0 2.5 M -1.8 4.5 L 0 2.5 L 1.8 4.5" />
      );

    case 'barycentre':
      return <path d="M -7.5 0 L -2.2 0 M 2.2 0 L 7.5 0 M 0 -7.5 L 0 -2.2 M 0 2.2 L 0 7.5" />;

    case 'stellar-cluster':
      return <path d="M -6.5 2 L 0 -3 L 6.5 2 M -6.5 -2.5 L 0 -7.5 L 6.5 -2.5" />;

    case 'construct':
      return (
        <path d="M -7 -3.5 L -7 -7 L -3.5 -7 M 3.5 -7 L 7 -7 L 7 -3.5 M 7 3.5 L 7 7 L 3.5 7 M -3.5 7 L -7 7 L -7 3.5" />
      );

    case 'terrestrial':
      return <circle cx="0" cy="0" r="5.5" />;

    case 'super-earth':
      return (
        <>
          <circle cx="0" cy="0" r="4" />
          <circle cx="0" cy="0" r="7.5" />
        </>
      );

    case 'gas-giant':
      return (
        <>
          <circle cx="0" cy="0" r="6.5" />
          <path d="M -4.6 4.6 L -1.8 1.8 M 1.8 -1.8 L 4.6 -4.6" />
        </>
      );

    case 'ice-giant':
      return (
        <>
          <circle cx="0" cy="0" r="5.2" />
          <path d="M -4.2 4.2 L -7.4 7.4 M 4.2 -4.2 L 7.4 -7.4" />
        </>
      );

    case 'dwarf-planet':
      return (
        <>
          <circle cx="0" cy="0" r="4.2" />
          <path d="M -8 0 L -4.8 0 M 4.8 0 L 8 0" />
        </>
      );

    case 'moon':
      return (
        <>
          <circle cx="0" cy="1" r="3.6" />
          <path d="M -5.5 -4.5 A 7.5 7.5 0 0 1 5.5 -4.5" />
        </>
      );

    case 'asteroid':
      return <path d="M 0 -5.5 L 4.5 0 L 0 5.5 L -4.5 0 Z" />;

    case 'comet':
      return (
        <>
          <circle cx="-2.5" cy="2.5" r="3.2" />
          <path d="M 0 0.5 L 7.5 -5.5 M -0.5 0 L 5.5 -7.5" />
        </>
      );

    case 'belt':
    case 'asteroid-belt':
    case 'kuiper-belt':
    case 'debris-disk':
      return <circle cx="0" cy="0" r="7" strokeDasharray="2.5 2.5" />;

    case 'nebula':
    case 'ism':
    case 'supernova-remnant':
      return (
        <path d="M -4.5 -5.5 A 4.5 4.5 0 0 1 4.5 -5.5 M 5.5 -4.5 A 4.5 4.5 0 0 1 5.5 4.5 M 4.5 5.5 A 4.5 4.5 0 0 1 -4.5 5.5 M -5.5 4.5 A 4.5 4.5 0 0 1 -5.5 -4.5" />
      );

    case 'habitable-zone':
      return (
        <>
          <circle cx="0" cy="0" r="3.8" />
          <circle cx="0" cy="0" r="7.8" strokeDasharray="2.5 2" />
        </>
      );
  }
};

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
  className,
  children,
  ...rest
}: CelestialSymbolProps) => {
  const meta = CELESTIAL_SYMBOL_META[type] ?? {
    type,
    label: type,
  };

  const combinedClassName = className
    ? `${styles.symbol} ${className}`
    : styles.symbol;

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
      href={href}
      target={target}
      rel={rel}
      className={`${combinedClassName} ${styles.symbolLink}`}
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
      className={combinedClassName}
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
