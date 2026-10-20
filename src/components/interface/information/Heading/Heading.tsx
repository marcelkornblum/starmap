import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Heading.module.css';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingSize = 'hero' | 'title' | 'section' | 'lead' | 'eyebrow';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
  size?: HeadingSize;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
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
  children,
  id,
  className,
  ...rest
}: HeadingProps) => {
  const Tag = as;
  const resolvedSize = size ?? resolveDefaultSize(as);
  const hasGroup = Boolean(eyebrow || subtitle || badge);

  if (hasGroup) {
    const combinedGroupClassName = className
      ? `${styles.headingGroup} ${className}`
      : styles.headingGroup;

    return (
      <div className={combinedGroupClassName} data-heading-group="true">
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

  const combinedClassName = className
    ? `${styles.heading} ${className}`
    : styles.heading;

  return (
    <Tag
      id={id}
      className={combinedClassName}
      data-heading="true"
      data-size={resolvedSize}
      {...rest}
    >
      {children}
    </Tag>
  );
};
