import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Heading.module.css';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingSize = 'hero' | 'title' | 'section' | 'lead' | 'eyebrow';

export interface HeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, 'className' | 'style'> {
  as?: HeadingLevel;
  size?: HeadingSize;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  visuallyHidden?: boolean;
  children?: ReactNode;
}

function resolveDefaultSize(as: HeadingLevel): HeadingSize {
  switch (as) {
    case 'h1':
      return 'title';
    case 'h2':
      return 'section';
    case 'h3':
      return 'lead';
    case 'h4':
    case 'h5':
    case 'h6':
    default:
      return 'eyebrow';
  }
}

export const Heading = ({
  as = 'h2',
  size,
  eyebrow,
  subtitle,
  badge,
  visuallyHidden,
  children,
  id,
  ...rest
}: HeadingProps) => {
  const Tag = as;
  const resolvedSize = size ?? resolveDefaultSize(as);
  const hasGroup = Boolean(eyebrow || subtitle || badge);

  if (hasGroup) {
    return (
      <div
        className={styles.headingGroup}
        data-heading-group="true"
        data-visually-hidden={visuallyHidden ? 'true' : undefined}
      >
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        {badge ? (
          <div className={styles.titleRow}>
            <Tag id={id} className={styles.heading} data-size={resolvedSize} {...rest}>
              {children}
            </Tag>
            {badge}
          </div>
        ) : (
          <Tag id={id} className={styles.heading} data-size={resolvedSize} {...rest}>
            {children}
          </Tag>
        )}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    );
  }

  return (
    <Tag
      id={id}
      className={styles.heading}
      data-heading="true"
      data-size={resolvedSize}
      data-visually-hidden={visuallyHidden ? 'true' : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
};
