import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  isValidElement,
  cloneElement,
  type HTMLAttributes,
  type ReactNode,
  type ReactElement,
} from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  /** The content displayed inside the tooltip bubble */
  text: ReactNode;
  /** Primary target position relative to the trigger. Default: 'top' */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** The trigger element that receives hover, focus, and aria-describedby */
  children?: ReactNode;
  /** Explicit id for the tooltip DOM element */
  id?: string;
  /** Controlled open state */
  isOpen?: boolean;
  /** Default open state when uncontrolled */
  defaultOpen?: boolean;
  /** Callback fired when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Boundary margin in pixels to prevent touching viewport edges. Default: 12 */
  boundaryMargin?: number;
  /** Optional class name applied to the outer wrapper (when wrapping children) */
  wrapperClassName?: string;
}

export const Tooltip = ({
  text,
  position = 'top',
  children,
  id: customId,
  isOpen: controlledIsOpen,
  defaultOpen,
  onOpenChange,
  boundaryMargin = 12,
  className,
  wrapperClassName,
  ...rest
}: TooltipProps) => {
  const generatedId = useId();
  const tooltipId = customId || generatedId;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const hasExplicitState = isControlled || defaultOpen !== undefined;
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen ?? false);
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const [effectivePosition, setEffectivePosition] = useState(position);
  const [effectiveAlign, setEffectiveAlign] = useState<'center' | 'start' | 'end'>('center');

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledIsOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  // Compute placement, auto-flip and screen-edge alignment clamping
  const computePlacement = useCallback(() => {
    if (typeof window === 'undefined') return;
    const triggerEl = wrapperRef.current ?? tooltipRef.current?.parentElement;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const margin = boundaryMargin;

    let nextPos = position;
    let nextAlign: 'center' | 'start' | 'end' = 'center';

    // 1. Vertical axis boundary check: flip if obstructed by viewport top/bottom
    if (nextPos === 'top' && triggerRect.top - tooltipRect.height - margin < 0) {
      nextPos = 'bottom';
    } else if (
      nextPos === 'bottom' &&
      triggerRect.bottom + tooltipRect.height + margin > window.innerHeight
    ) {
      nextPos = 'top';
    }

    // 2. Horizontal axis boundary check for lateral positions
    if (nextPos === 'left' && triggerRect.left - tooltipRect.width - margin < 0) {
      nextPos = 'right';
    } else if (
      nextPos === 'right' &&
      triggerRect.right + tooltipRect.width + margin > window.innerWidth
    ) {
      nextPos = 'left';
    }

    // 3. Horizontal alignment clamping for top/bottom positions
    if (nextPos === 'top' || nextPos === 'bottom') {
      const halfWidth = tooltipRect.width / 2;
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;

      if (triggerCenterX + halfWidth > window.innerWidth - margin) {
        nextAlign = 'end';
      } else if (triggerCenterX - halfWidth < margin) {
        nextAlign = 'start';
      } else {
        nextAlign = 'center';
      }
    }

    // 4. Vertical alignment clamping for left/right positions
    if (nextPos === 'left' || nextPos === 'right') {
      const halfHeight = tooltipRect.height / 2;
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;

      if (triggerCenterY + halfHeight > window.innerHeight - margin) {
        nextAlign = 'end';
      } else if (triggerCenterY - halfHeight < margin) {
        nextAlign = 'start';
      } else {
        nextAlign = 'center';
      }
    }

    setEffectivePosition(nextPos);
    setEffectiveAlign(nextAlign);
  }, [position, boundaryMargin]);

  // Recalculate placement when visible and attach window listeners
  useEffect(() => {
    if (hasExplicitState && !isOpen) return;

    computePlacement();

    window.addEventListener('resize', computePlacement);
    window.addEventListener('scroll', computePlacement, true);

    return () => {
      window.removeEventListener('resize', computePlacement);
      window.removeEventListener('scroll', computePlacement, true);
    };
  }, [isOpen, hasExplicitState, computePlacement]);

  // Outside click and Escape key dismissal when open
  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const triggerEl = wrapperRef.current ?? tooltipRef.current?.parentElement;
      if (triggerEl && !triggerEl.contains(target) && (!tooltipRef.current || !tooltipRef.current.contains(target))) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setOpen]);

  const handleMouseEnter = () => {
    if (!hasExplicitState) {
      computePlacement();
    }
  };

  const handleFocus = () => {
    if (!hasExplicitState) {
      computePlacement();
    }
  };

  const combinedClassName = className
    ? `${styles.tooltip} ${className}`
    : styles.tooltip;

  const combinedWrapperClassName = wrapperClassName
    ? `${styles.tooltipWrapper} ${wrapperClassName}`
    : styles.tooltipWrapper;

  const isVisible = hasExplicitState ? isOpen : true;

  const triggerElement = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': [
          (children.props as { 'aria-describedby'?: string })?.['aria-describedby'],
          isVisible ? tooltipId : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      })
    : children;

  const tooltipElement = isVisible ? (
    <div
      ref={tooltipRef}
      id={tooltipId}
      className={combinedClassName}
      data-position={effectivePosition}
      data-align={effectiveAlign}
      data-state={hasExplicitState && isOpen ? 'open' : undefined}
      role="tooltip"
      {...rest}
    >
      <span className={styles.tooltipContent}>{text}</span>
    </div>
  ) : null;

  if (children) {
    return (
      <div
        ref={wrapperRef}
        className={combinedWrapperClassName}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
      >
        {triggerElement}
        {tooltipElement}
      </div>
    );
  }

  return tooltipElement;
};
