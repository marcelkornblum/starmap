import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Heading } from '../../information/Heading/Heading';
import { Cluster } from '../../layouts/Cluster/Cluster';
import styles from './CollapsibleSection.module.css';

export interface CollapsibleSectionProps
  extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  readonly title: string;
  readonly headingId: string;
  readonly headingAs?: 'h2' | 'h3' | 'h4';
  readonly defaultOpen?: boolean;
  readonly actions?: ReactNode;
  readonly toggleTestId?: string;
  readonly children: ReactNode;
}

export const CollapsibleSection = ({
  title,
  headingId,
  headingAs = 'h4',
  defaultOpen = true,
  actions,
  toggleTestId,
  children,
  ...rest
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={styles.section}
      data-collapsed={isOpen ? undefined : 'true'}
      {...rest}
    >
      <Cluster justify="between" align="center" gap="tight">
        <Heading as={headingAs} size="eyebrow" id={headingId}>
          <button
            type="button"
            className={styles.trigger}
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={() => setIsOpen((prev) => !prev)}
            data-testid={toggleTestId}
          >
            <span>{title}</span>
            <span
              className={styles.chevron}
              data-expanded={isOpen ? 'true' : 'false'}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
        </Heading>
        {actions ?? null}
      </Cluster>
      {isOpen ? (
        <div id={contentId} className={styles.body}>
          {children}
        </div>
      ) : null}
    </section>
  );
};
