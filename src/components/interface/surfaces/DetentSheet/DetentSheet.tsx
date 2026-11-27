import React, { type ReactNode } from 'react';
import styles from './DetentSheet.module.css';
import { type DetentLevel, resolveKeyboardDetentStep } from './detentSheetMath';
import { useDetentSheetController } from './useDetentSheetController';

export interface DetentSheetMidStageProps {
  readonly testId?: string;
  readonly children: ReactNode;
}

export const DetentSheetMidStage: React.FC<DetentSheetMidStageProps> = ({ testId, children }) => (
  <div
    className={styles.peekMidStage}
    data-detent-mid-stage="true"
    {...(testId !== undefined ? { 'data-testid': testId } : {})}
  >
    <div className={styles.peekMidInner} data-detent-mid-inner="true">
      {children}
    </div>
  </div>
);

export interface DetentSheetProps {
  readonly testIdPrefix: string;
  readonly heading: ReactNode;
  readonly headingId?: string;
  readonly activeDetent?: DetentLevel;
  readonly onDetentChange?: (detent: DetentLevel) => void;
  readonly peek: ReactNode;
  readonly peekMidStage?: ReactNode;
  readonly peekActions?: ReactNode;
  readonly partial?: ReactNode;
  readonly full?: ReactNode;
  readonly children?: ReactNode;
  readonly [key: `data-${string}`]: string | undefined;
}

/**
 * Shared multi-detent sheet primitive.
 * Supports progressive disclosure across Peek, Partial, and Full detents
 * with accessible landmarks, intrinsic mid-stage measurement, progress interpolation, and snap physics.
 */
export const DetentSheet: React.FC<DetentSheetProps> = ({
  testIdPrefix,
  heading,
  headingId,
  activeDetent = 'peek',
  onDetentChange,
  peek,
  peekMidStage,
  peekActions,
  partial,
  full,
  children,
  ...rest
}) => {
  const resolvedHeadingId = headingId ?? `${testIdPrefix}-panel-heading`;
  const {
    sheetRef,
    dragHandleRef,
    peekSectionRef,
    detentState,
    detentStateRef,
    isFullScreenState,
    isDraggingState,
    isBeyondPartialState,
    isScrollableState,
    peekHeightPxState,
    partialHeightPxState,
    applyTapDetent,
    handlePointerDown,
    isRecentDrag,
    isSheetDraggable,
  } = useDetentSheetController({ activeDetent, onDetentChange });

  return (
    <aside
      {...rest}
      ref={sheetRef}
      aria-labelledby={resolvedHeadingId}
      data-testid={`${testIdPrefix}-panel`}
      data-detent={detentState}
      data-is-full-screen={isFullScreenState ? 'true' : 'false'}
      data-is-dragging={isDraggingState ? 'true' : 'false'}
      data-beyond-partial={isBeyondPartialState ? 'true' : 'false'}
      data-scrollable={isScrollableState ? 'true' : 'false'}
      data-min-height-px={peekHeightPxState}
      data-partial-height-px={partialHeightPxState}
      className={styles.detentSheet}
      onPointerDown={handlePointerDown}
      onDragStart={(e) => {
        if (isSheetDraggable()) {
          e.preventDefault();
        }
      }}
      onClickCapture={(e) => {
        if (isRecentDrag()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div
        ref={dragHandleRef}
        className={styles.dragHandleBar}
        data-testid={`${testIdPrefix}-drag-handle`}
        role="separator"
        tabIndex={0}
        aria-orientation="horizontal"
        aria-label="Drag to resize panel"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={detentState === 'peek' ? 0 : detentState === 'partial' ? 1 : 2}
        aria-valuetext={detentState}
        onClick={() => {
          if (isRecentDrag()) return;
          applyTapDetent(detentStateRef.current === 'peek' ? 'partial' : 'peek');
        }}
        onKeyDown={(e) => {
          const next = resolveKeyboardDetentStep(detentStateRef.current, e.key);
          if (!next) return;
          e.preventDefault();
          applyTapDetent(next);
        }}
      >
        <span className={styles.dragHandlePill} />
      </div>

      <h2 id={resolvedHeadingId} className={styles.srOnly}>{heading}</h2>

      <section
        ref={peekSectionRef}
        aria-labelledby={`${testIdPrefix}-peek-heading`}
        data-testid={`${testIdPrefix}-detent-peek`}
        data-detent-section="peek"
        className={styles.detentSection}
        onClick={(e) => {
          if (isRecentDrag()) return;
          if (detentStateRef.current !== 'peek' || (e.target as Element | null)?.closest?.('a, button')) return;
          applyTapDetent('partial');
        }}
      >
        <h3 id={`${testIdPrefix}-peek-heading`} className={styles.srOnly}>Peek</h3>
        {peek}
        {peekMidStage !== undefined && peekMidStage !== null ? (
          <DetentSheetMidStage testId={`${testIdPrefix}-overview-mid-stage`}>
            {peekMidStage}
          </DetentSheetMidStage>
        ) : null}
        {peekActions !== undefined && peekActions !== null ? (
          <div className={styles.peekActions} data-detent-actions="true">
            {peekActions}
          </div>
        ) : null}
      </section>

      {([
        ['partial', 'Partial', partial],
        ['full', 'Full', full],
      ] as const).map(([key, label, content]) =>
        content !== undefined ? (
          <section
            key={key}
            aria-labelledby={`${testIdPrefix}-${key}-heading`}
            data-testid={`${testIdPrefix}-detent-${key}`}
            data-detent-section={key}
            className={styles.detentSection}
          >
            <h3 id={`${testIdPrefix}-${key}-heading`} className={styles.srOnly}>{label}</h3>
            {content}
          </section>
        ) : null,
      )}

      {children}
    </aside>
  );
};
