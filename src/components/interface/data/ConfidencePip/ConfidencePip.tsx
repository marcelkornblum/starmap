import {
  useState,
  useRef,
  useCallback,
  useId,
  type HTMLAttributes,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Tooltip } from '../../surfaces/Tooltip/Tooltip';
import styles from './ConfidencePip.module.css';

export type ConfidenceLevel =
  | 'confirmed'
  | 'candidate'
  | 'theoretical'
  | 'projected'
  | 'unverified'
  | 'high'
  | 'medium'
  | 'moderate'
  | 'low';

export interface ConfidencePipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onClick'> {
  /** The observational confidence level represented by the pip */
  confidence: ConfidenceLevel;
  /** Custom label to show for the level name. If omitted, derives from confidence */
  label?: string;
  /** Size variant of the pip dot */
  size?: 'sm' | 'md' | 'lg';
  /** Optional additional details or astrometric metrics to display inside the tooltip */
  details?: ReactNode;
  /** Position of the opened tooltip relative to the pip */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Controlled open state of the tooltip */
  isOpen?: boolean;
  /** Initial open state when uncontrolled */
  defaultOpen?: boolean;
  /** Callback fired when the tooltip open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Optional click handler on the pip trigger button */
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function normalizeConfidence(confidence: ConfidenceLevel): {
  canonical: 'confirmed' | 'candidate' | 'theoretical' | 'unverified';
  defaultLabel: string;
} {
  switch (confidence) {
    case 'confirmed':
    case 'high':
      return { canonical: 'confirmed', defaultLabel: 'Confirmed' };
    case 'candidate':
    case 'medium':
    case 'moderate':
      return { canonical: 'candidate', defaultLabel: 'Candidate' };
    case 'theoretical':
    case 'projected':
    case 'low':
      return { canonical: 'theoretical', defaultLabel: 'Theoretical' };
    case 'unverified':
    default:
      return { canonical: 'unverified', defaultLabel: 'Unverified' };
  }
}

export const ConfidencePip = ({
  confidence,
  label,
  size = 'md',
  details,
  tooltipPosition = 'top',
  isOpen: controlledIsOpen,
  defaultOpen = false,
  onOpenChange,
  onClick,
  className,
  ...rest
}: ConfidencePipProps) => {
  const generatedId = useId();
  const tooltipId = `confidence-tooltip-${generatedId}`;
  const containerRef = useRef<HTMLSpanElement>(null);

  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const { canonical, defaultLabel } = normalizeConfidence(confidence);
  const displayLabel = label || defaultLabel.toLowerCase();

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledIsOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  const handleButtonClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    setOpen(!isOpen);
  };

  const combinedClassName = className
    ? `${styles.pipWrapper} ${className}`
    : styles.pipWrapper;

  const tooltipContent = (
    <span className={styles.tooltipContent}>
      <span className={styles.tooltipPrefix}>We have </span>
      <span
        className={styles.levelName}
        data-confidence={canonical}
        data-testid="confidence-level-name"
      >
        {displayLabel}
      </span>
      <span className={styles.tooltipSuffix}> confidence in this data</span>
      {details && (
        <span className={styles.tooltipDetails} data-testid="confidence-pip-details">
          {details}
        </span>
      )}
    </span>
  );

  return (
    <span
      ref={containerRef}
      className={combinedClassName}
      data-confidence={canonical}
      data-size={size}
      data-testid="confidence-pip-wrapper"
      {...rest}
    >
      <button
        type="button"
        className={styles.pipButton}
        onClick={handleButtonClick}
        aria-label={`We have ${displayLabel} confidence in this data`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-describedby={isOpen ? tooltipId : undefined}
        data-testid="confidence-pip-trigger"
      >
        <span className={styles.dot} data-testid="confidence-pip-dot" />
      </button>

      {isOpen && (
        <Tooltip
          id={tooltipId}
          text={tooltipContent}
          position={tooltipPosition}
          isOpen={true}
          onOpenChange={setOpen}
          data-testid="confidence-pip-tooltip"
        />
      )}
    </span>
  );
};
