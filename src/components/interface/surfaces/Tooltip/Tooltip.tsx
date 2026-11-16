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

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style'> {
  text: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
  id?: string;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  boundaryMargin?: number;
}

interface TooltipActiveEffectsProps {
  readonly isPlacementActive: boolean;
  readonly isOpen: boolean;
  readonly position: 'top' | 'bottom' | 'left' | 'right';
  readonly boundaryMargin: number;
  readonly wrapperRef: React.RefObject<HTMLSpanElement | null>;
  readonly tooltipRef: React.RefObject<HTMLSpanElement | null>;
  readonly setPlacement: (pos: 'top' | 'bottom' | 'left' | 'right', align: 'center' | 'start' | 'end') => void;
  readonly setOpen: (next: boolean) => void;
}

const TooltipActiveEffects = ({
  isPlacementActive,
  isOpen,
  position,
  boundaryMargin,
  wrapperRef,
  tooltipRef,
  setPlacement,
  setOpen,
}: TooltipActiveEffectsProps) => {
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

    if (nextPos === 'left' || nextPos === 'right') {
      const fitsLeft = triggerRect.left - tooltipRect.width - margin >= 0;
      const fitsRight = triggerRect.right + tooltipRect.width + margin <= window.innerWidth;
      if (!fitsLeft && !fitsRight) {
        nextPos = triggerRect.top - tooltipRect.height - margin >= 0 ? 'top' : 'bottom';
      } else if (nextPos === 'left' && !fitsLeft) {
        nextPos = 'right';
      } else if (nextPos === 'right' && !fitsRight) {
        nextPos = 'left';
      }
    }

    if (nextPos === 'top' && triggerRect.top - tooltipRect.height - margin < 0) {
      nextPos = 'bottom';
    } else if (nextPos === 'bottom' && triggerRect.bottom + tooltipRect.height + margin > window.innerHeight) {
      nextPos = 'top';
    }

    if (nextPos === 'top' || nextPos === 'bottom') {
      const halfWidth = tooltipRect.width / 2;
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      const overflowsRight = triggerCenterX + halfWidth > window.innerWidth - margin;
      const overflowsLeft = triggerCenterX - halfWidth < margin;
      if (overflowsRight && !overflowsLeft) nextAlign = 'end';
      else if (overflowsLeft && !overflowsRight) nextAlign = 'start';
      else if (overflowsRight && overflowsLeft) nextAlign = triggerCenterX < window.innerWidth / 2 ? 'start' : 'end';
    } else {
      const halfHeight = tooltipRect.height / 2;
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;
      const overflowsBottom = triggerCenterY + halfHeight > window.innerHeight - margin;
      const overflowsTop = triggerCenterY - halfHeight < margin;
      if (overflowsBottom && !overflowsTop) nextAlign = 'end';
      else if (overflowsTop && !overflowsBottom) nextAlign = 'start';
      else if (overflowsBottom && overflowsTop) nextAlign = triggerCenterY < window.innerHeight / 2 ? 'start' : 'end';
    }

    setPlacement(nextPos, nextAlign);
  }, [position, boundaryMargin, wrapperRef, tooltipRef, setPlacement]);

  useEffect(() => {
    if (!isPlacementActive) return;
    computePlacement();
    window.addEventListener('resize', computePlacement);
    window.addEventListener('scroll', computePlacement, true);
    return () => {
      window.removeEventListener('resize', computePlacement);
      window.removeEventListener('scroll', computePlacement, true);
    };
  }, [isPlacementActive, computePlacement]);

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
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setOpen, wrapperRef, tooltipRef]);

  return null;
};

export const Tooltip = ({
  text,
  position = 'top',
  children,
  id: customId,
  isOpen: controlledIsOpen,
  defaultOpen,
  onOpenChange,
  boundaryMargin = 12,
  ...rest
}: TooltipProps) => {
  const generatedId = useId();
  const tooltipId = customId || generatedId;

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const hasExplicitState = isControlled || defaultOpen !== undefined;
  const [state, setState] = useState({
    open: defaultOpen ?? false,
    interacting: false,
    pos: position,
    align: 'center' as 'center' | 'start' | 'end',
  });
  const isOpen = isControlled ? controlledIsOpen : state.open;
  const isPlacementActive = hasExplicitState ? isOpen : (!children || state.interacting);

  const effectivePosition = state.interacting || isOpen ? state.pos : position;
  const effectiveAlign = state.interacting || isOpen ? state.align : 'center';

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setState((prev) => (prev.open === nextOpen ? prev : { ...prev, open: nextOpen }));
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const setPlacement = useCallback(
    (pos: 'top' | 'bottom' | 'left' | 'right', align: 'center' | 'start' | 'end') => {
      setState((prev) => (prev.pos === pos && prev.align === align ? prev : { ...prev, pos, align }));
    },
    [],
  );

  const handleMouseEnter = () => {
    if (!hasExplicitState) {
      setState((prev) => (prev.interacting ? prev : { ...prev, interacting: true, pos: position, align: 'center' }));
    }
  };

  const handleMouseLeave = () => {
    if (!hasExplicitState) {
      setState((prev) => (!prev.interacting ? prev : { ...prev, interacting: false }));
    }
  };

  const handleFocus = () => {
    if (!hasExplicitState) {
      setState((prev) => (prev.interacting ? prev : { ...prev, interacting: true, pos: position, align: 'center' }));
    }
  };

  const handleBlur = () => {
    if (!hasExplicitState) {
      setState((prev) => (!prev.interacting ? prev : { ...prev, interacting: false }));
    }
  };

  const isVisible = hasExplicitState ? isOpen : true;
  const isEffectsActive = isPlacementActive || isOpen;

  const childDescribedBy = isValidElement(children)
    ? (children.props as { 'aria-describedby'?: string })?.['aria-describedby']
    : undefined;
  const nextDescribedBy = isVisible
    ? (childDescribedBy ? `${childDescribedBy} ${tooltipId}` : tooltipId)
    : childDescribedBy;

  const triggerElement = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': nextDescribedBy || undefined,
      })
    : children;

  const tooltipElement = isVisible ? (
    <span
      ref={tooltipRef}
      id={tooltipId}
      className={styles.tooltip}
      data-position={effectivePosition}
      data-align={effectiveAlign}
      data-state={hasExplicitState && isOpen ? 'open' : undefined}
      role="tooltip"
      {...rest}
    >
      <span className={styles.tooltipContent}>{text}</span>
    </span>
  ) : null;

  const activeEffectsElement = isEffectsActive ? (
    <TooltipActiveEffects
      isPlacementActive={isPlacementActive}
      isOpen={isOpen}
      position={position}
      boundaryMargin={boundaryMargin}
      wrapperRef={wrapperRef}
      tooltipRef={tooltipRef}
      setPlacement={setPlacement}
      setOpen={setOpen}
    />
  ) : null;

  if (children) {
    return (
      <span
        ref={wrapperRef}
        className={styles.tooltipWrapper}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {triggerElement}
        {tooltipElement}
        {activeEffectsElement}
      </span>
    );
  }

  return (
    <>
      {tooltipElement}
      {activeEffectsElement}
    </>
  );
};
