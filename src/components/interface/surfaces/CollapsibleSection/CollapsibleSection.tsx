import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Heading } from '../../information/Heading/Heading';
import { Cluster } from '../../layouts/Cluster/Cluster';
import styles from './CollapsibleSection.module.css';

export interface CollapsibleSectionProps
  extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  readonly title: string;
  readonly headingId?: string;
  readonly headingAs?: 'h2' | 'h3' | 'h4';
  readonly defaultOpen?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly actions?: ReactNode;
  readonly toggleTestId?: string;
  readonly children: ReactNode;
}

export const CollapsibleSection = ({
  title,
  headingId,
  headingAs = 'h4',
  defaultOpen = true,
  open,
  onOpenChange,
  actions,
  toggleTestId,
  children,
  ...rest
}: CollapsibleSectionProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const generatedHeadingId = useId();
  const contentId = useId();

  const resolvedHeadingId = headingId ?? generatedHeadingId;
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const handleToggle = () => {
    const nextOpen = !isOpen;
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <section
      aria-labelledby={resolvedHeadingId}
      className={styles.section}
      data-expanded={isOpen ? 'true' : 'false'}
      {...rest}
    >
      <Cluster justify="between" align="center" gap="tight">
        <Heading as={headingAs} size="eyebrow" id={resolvedHeadingId}>
          <button
            type="button"
            className={styles.trigger}
            aria-expanded={isOpen}
            aria-controls={isOpen ? contentId : undefined}
            onClick={handleToggle}
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
