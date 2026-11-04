import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import styles from './DetentSheet.module.css';

export type DetentLevel = 'peek' | 'partial' | 'full';

export const MIN_SHEET_HEIGHT_PX = 56;
export const DEFAULT_MOBILE_SHEET_RATIO = 0.36;

export interface SheetDragStepInput {
  readonly startHeightPx: number;
  readonly startClientY: number;
  readonly currentClientY: number;
  readonly viewportHeightPx: number;
  readonly minHeightPx?: number;
  readonly isFullScreen: boolean;
  readonly scrollTop: number;
}

export interface SheetDragStepResult {
  readonly nextHeightPx: number;
  readonly isFullScreen: boolean;
  readonly shouldPreventScroll: boolean;
  readonly effectiveDetent: DetentLevel;
}

export function resolveDetentFromHeight(heightPx: number, viewportHeightPx: number): DetentLevel {
  const ratio = heightPx / Math.max(1, viewportHeightPx);
  if (ratio < 0.45) return 'peek';
  if (ratio < 0.8) return 'partial';
  return 'full';
}

export function computeSheetDragStep(input: SheetDragStepInput): SheetDragStepResult {
  const deltaY = input.currentClientY - input.startClientY;
  const minH = input.minHeightPx ?? MIN_SHEET_HEIGHT_PX;
  const maxH = Math.max(minH, input.viewportHeightPx);

  let nextHeightPx: number;
  let isFullScreen: boolean;
  let shouldPreventScroll: boolean;

  if (input.isFullScreen) {
    if (input.scrollTop > 0) {
      nextHeightPx = maxH;
      isFullScreen = true;
      shouldPreventScroll = false;
    } else if (deltaY > 0) {
      nextHeightPx = Math.max(minH, Math.min(maxH, maxH - deltaY));
      isFullScreen = nextHeightPx >= maxH - 4;
      shouldPreventScroll = true;
    } else {
      nextHeightPx = maxH;
      isFullScreen = true;
      shouldPreventScroll = false;
    }
  } else {
    shouldPreventScroll = true;
    nextHeightPx = Math.max(minH, Math.min(maxH, input.startHeightPx - deltaY));
    isFullScreen = nextHeightPx >= maxH - 4;
  }

  const effectiveDetent = resolveDetentFromHeight(nextHeightPx, maxH);

  return {
    nextHeightPx,
    isFullScreen,
    shouldPreventScroll,
    effectiveDetent,
  };
}

export interface DetentSheetProps {
  readonly testIdPrefix: string;
  readonly heading: ReactNode;
  readonly headingId?: string;
  readonly activeDetent?: DetentLevel;
  readonly peek: ReactNode;
  readonly partial?: ReactNode;
  readonly full?: ReactNode;
  readonly className?: string;
  readonly style?: React.CSSProperties;
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
  style,
  children,
  'data-entity-id': entityId,
  'data-system-id': systemId,
  'data-focused-kind': focusedKind,
}) => {
  const resolvedHeadingId = headingId ?? `${testIdPrefix}-panel-heading`;
  const sheetRef = useRef<HTMLElement | null>(null);

  const getViewportHeight = () => (typeof window !== 'undefined' ? window.innerHeight : 800);

  const [detentState, setDetentState] = useState<DetentLevel>(activeDetent);
  const [isFullScreenState, setIsFullScreenState] = useState<boolean>(activeDetent === 'full');

  const prevActiveDetentRef = useRef(activeDetent);
  useEffect(() => {
    if (prevActiveDetentRef.current !== activeDetent) {
      prevActiveDetentRef.current = activeDetent;
      setDetentState(activeDetent);
      setIsFullScreenState(activeDetent === 'full');
      const vh = getViewportHeight();
      let h = Math.round(vh * DEFAULT_MOBILE_SHEET_RATIO);
      if (activeDetent === 'full') {
        h = vh;
      } else if (activeDetent === 'partial') {
        h = Math.round(vh * 0.6);
      }
      sheetRef.current?.style.setProperty('--sheet-mobile-height', `${h}px`);
    }
  }, [activeDetent]);

  const dragStartRef = useRef<{
    startY: number;
    startHeight: number;
    isFullScreen: boolean;
    isDragging: boolean;
  } | null>(null);

  const startDrag = (clientY: number) => {
    const currentHeight = sheetRef.current
      ? sheetRef.current.getBoundingClientRect().height
      : Math.round(getViewportHeight() * DEFAULT_MOBILE_SHEET_RATIO);
    dragStartRef.current = {
      startY: clientY,
      startHeight: currentHeight,
      isFullScreen: isFullScreenState,
      isDragging: true,
    };
  };

  const onDragMove = (clientY: number, e?: { cancelable?: boolean; preventDefault?: () => void }) => {
    if (!dragStartRef.current || !dragStartRef.current.isDragging) return;
    const vh = getViewportHeight();
    const scrollTop = sheetRef.current ? sheetRef.current.scrollTop : 0;
    const step = computeSheetDragStep({
      startHeightPx: dragStartRef.current.startHeight,
      startClientY: dragStartRef.current.startY,
      currentClientY: clientY,
      viewportHeightPx: vh,
      minHeightPx: MIN_SHEET_HEIGHT_PX,
      isFullScreen: dragStartRef.current.isFullScreen,
      scrollTop,
    });

    if (step.shouldPreventScroll && e?.cancelable && e.preventDefault) {
      e.preventDefault();
    }

    sheetRef.current?.style.setProperty('--sheet-mobile-height', `${step.nextHeightPx}px`);
    if (step.effectiveDetent !== detentState) {
      setDetentState(step.effectiveDetent);
    }
    if (step.isFullScreen !== isFullScreenState) {
      setIsFullScreenState(step.isFullScreen);
    }
  };

  const endDrag = () => {
    if (dragStartRef.current) {
      dragStartRef.current.isDragging = false;
      dragStartRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startDrag(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.isDragging) {
      onDragMove(e.clientY, e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      endDrag();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      endDrag();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      startDrag(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartRef.current?.isDragging && e.touches.length > 0) {
      onDragMove(e.touches[0].clientY, e);
    }
  };

  const handleTouchEnd = () => {
    endDrag();
  };

  const rootClasses = [styles.detentSheet, className].filter(Boolean).join(' ');

  return (
    <aside
      ref={sheetRef}
      aria-labelledby={resolvedHeadingId}
      data-testid={`${testIdPrefix}-panel`}
      data-detent={detentState}
      data-is-full-screen={isFullScreenState ? 'true' : 'false'}
      data-min-height-px={MIN_SHEET_HEIGHT_PX}
      className={rootClasses}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      {...(entityId !== undefined ? { 'data-entity-id': entityId } : {})}
      {...(systemId !== undefined ? { 'data-system-id': systemId } : {})}
      {...(focusedKind !== undefined ? { 'data-focused-kind': focusedKind } : {})}
    >
      <div
        className={styles.dragHandleBar}
        data-testid={`${testIdPrefix}-drag-handle`}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Drag to resize panel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <span className={styles.dragHandlePill} />
      </div>

      <h2 id={resolvedHeadingId} className={styles.srOnly}>
        {heading}
      </h2>

      <section
        aria-labelledby={`${testIdPrefix}-peek-heading`}
        data-testid={`${testIdPrefix}-detent-peek`}
        data-detent-section="peek"
        className={styles.detentSection}
      >
        <h3 id={`${testIdPrefix}-peek-heading`} className={styles.srOnly}>
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
          <h3 id={`${testIdPrefix}-partial-heading`} className={styles.srOnly}>
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
          <h3 id={`${testIdPrefix}-full-heading`} className={styles.srOnly}>
            Full
          </h3>
          {full}
        </section>
      ) : null}

      {children}
    </aside>
  );
};
