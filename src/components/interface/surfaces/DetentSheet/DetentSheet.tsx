import type React from 'react';
import type { ReactNode } from 'react';
import styles from './DetentSheet.module.css';

export type DetentLevel = 'peek' | 'partial' | 'full';

export interface DetentSheetProps {
  readonly testIdPrefix: string;
  readonly heading: ReactNode;
  readonly headingId?: string;
  readonly activeDetent?: DetentLevel;
  readonly peek: ReactNode;
  readonly partial?: ReactNode;
  readonly full?: ReactNode;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly 'data-entity-id'?: string;
  readonly 'data-system-id'?: string;
  readonly 'data-focused-kind'?: string;
}

/**
 * Shared multi-detent sheet primitive.
 * Supports progressive disclosure across Peek, Partial, and Full detents
 * with accessible landmarks and semantic data-testid attributes.
 */
export const DetentSheet: React.FC<DetentSheetProps> = ({
  testIdPrefix,
  heading,
  headingId,
  activeDetent = 'peek',
  peek,
  partial,
  full,
  className,
  children,
  'data-entity-id': entityId,
  'data-system-id': systemId,
  'data-focused-kind': focusedKind,
}) => {
  const resolvedHeadingId = headingId ?? `${testIdPrefix}-panel-heading`;

  const rootClasses = [styles.detentSheet, className].filter(Boolean).join(' ');

  return (
    <aside
      aria-labelledby={resolvedHeadingId}
      data-testid={`${testIdPrefix}-panel`}
      data-detent={activeDetent}
      className={rootClasses}
      {...(entityId !== undefined ? { 'data-entity-id': entityId } : {})}
      {...(systemId !== undefined ? { 'data-system-id': systemId } : {})}
      {...(focusedKind !== undefined ? { 'data-focused-kind': focusedKind } : {})}
    >
      <h2 id={resolvedHeadingId}>
        {heading}
      </h2>

      <section
        aria-labelledby={`${testIdPrefix}-peek-heading`}
        data-testid={`${testIdPrefix}-detent-peek`}
        data-detent-section="peek"
        className={styles.detentSection}
      >
        <h3 id={`${testIdPrefix}-peek-heading`}>
          Peek
        </h3>
        {peek}
      </section>

      {partial !== undefined ? (
        <section
          aria-labelledby={`${testIdPrefix}-partial-heading`}
          data-testid={`${testIdPrefix}-detent-partial`}
          data-detent-section="partial"
          className={styles.detentSection}
        >
          <h3 id={`${testIdPrefix}-partial-heading`}>
            Partial
          </h3>
          {partial}
        </section>
      ) : null}

      {full !== undefined ? (
        <section
          aria-labelledby={`${testIdPrefix}-full-heading`}
          data-testid={`${testIdPrefix}-detent-full`}
          data-detent-section="full"
          className={styles.detentSection}
        >
          <h3 id={`${testIdPrefix}-full-heading`}>
            Full
          </h3>
          {full}
        </section>
      ) : null}

      {children}
    </aside>
  );
};
