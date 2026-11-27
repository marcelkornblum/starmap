import { useState, useRef, useEffect, useCallback, type PointerEvent } from 'react';
import {
  type DetentLevel,
  type MeasuredSheetMetrics,
  DEFAULT_PEEK_HEIGHT_PX,
  computeSheetDragStep,
  computeSheetReleaseSnap,
  resolveDetentTargetHeight,
} from './detentSheetMath';
import {
  measureDetentSheetMetrics,
  readDetentSheetHeightPx,
  applyDetentSheetCssVars,
  observeDetentSheetLayout,
} from './detentSheetDom';

const DRAG_CLICK_GUARD_MS = 350;
const DRAG_MOVE_THRESHOLD_PX = 5;

function getViewportHeight(): number {
  return typeof window !== 'undefined' ? window.innerHeight : 800;
}

export interface UseDetentSheetControllerParams {
  readonly activeDetent: DetentLevel;
  readonly onDetentChange?: (detent: DetentLevel) => void;
}

export function useDetentSheetController({
  activeDetent,
  onDetentChange,
}: UseDetentSheetControllerParams) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const dragHandleRef = useRef<HTMLDivElement | null>(null);
  const peekSectionRef = useRef<HTMLElement | null>(null);

  const [detentState, setDetentState] = useState<DetentLevel>(activeDetent);
  const [isFullScreenState, setIsFullScreenState] = useState<boolean>(activeDetent === 'full');
  const [isDraggingState, setIsDraggingState] = useState<boolean>(false);
  const [isBeyondPartialState, setIsBeyondPartialState] = useState<boolean>(activeDetent === 'full');
  const [peekHeightPxState, setPeekHeightPxState] = useState<number>(DEFAULT_PEEK_HEIGHT_PX);

  const detentStateRef = useRef<DetentLevel>(detentState);
  const isFullScreenRef = useRef<boolean>(isFullScreenState);
  useEffect(() => { detentStateRef.current = detentState; }, [detentState]);
  useEffect(() => { isFullScreenRef.current = isFullScreenState; }, [isFullScreenState]);

  const freeRestHeightRef = useRef<number | null>(null);
  const metricsRef = useRef<MeasuredSheetMetrics>({
    stageHeightPx: getViewportHeight(),
    peekHeightPx: DEFAULT_PEEK_HEIGHT_PX,
    midStageNaturalPx: 0,
  });
  const lastDragEndAtRef = useRef<number>(0);
  const dragStartRef = useRef<{
    startY: number;
    startHeight: number;
    startDetent: DetentLevel;
    isFullScreen: boolean;
    isDragging: boolean;
    hasMoved: boolean;
  } | null>(null);

  const measureMetrics = useCallback((): MeasuredSheetMetrics => {
    const next = measureDetentSheetMetrics(
      sheetRef.current,
      dragHandleRef.current,
      peekSectionRef.current,
      getViewportHeight(),
    );
    metricsRef.current = next;
    return next;
  }, []);

  const syncSheetProperties = useCallback(
    (heightPx: number, detent: DetentLevel, metrics: MeasuredSheetMetrics) => {
      const { beyondPartial, peekHeightPx } = applyDetentSheetCssVars(
        sheetRef.current,
        heightPx,
        detent,
        metrics,
      );
      setIsBeyondPartialState((prev) => (prev === beyondPartial ? prev : beyondPartial));
      setPeekHeightPxState((prev) => (prev === peekHeightPx ? prev : peekHeightPx));
    },
    [],
  );

  const isFirstMountRef = useRef(true);
  const prevActiveDetentRef = useRef(activeDetent);
  useEffect(() => {
    if (isFirstMountRef.current || prevActiveDetentRef.current !== activeDetent) {
      isFirstMountRef.current = false;
      prevActiveDetentRef.current = activeDetent;
      freeRestHeightRef.current = null;
      detentStateRef.current = activeDetent;
      isFullScreenRef.current = activeDetent === 'full';
      setDetentState(activeDetent);
      setIsFullScreenState(activeDetent === 'full');
      const metrics = measureMetrics();
      syncSheetProperties(resolveDetentTargetHeight(activeDetent, metrics), activeDetent, metrics);
    }
  }, [activeDetent, measureMetrics, syncSheetProperties]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    return observeDetentSheetLayout(sheet, peekSectionRef.current, () => {
      const metrics = measureMetrics();
      if (dragStartRef.current?.isDragging) {
        const midSize = `${Math.round(metrics.midStageNaturalPx)}px`;
        if (sheet.style.getPropertyValue('--detent-mid-stage-size') !== midSize) {
          sheet.style.setProperty('--detent-mid-stage-size', midSize);
        }
        return;
      }
      const currentDetent = detentStateRef.current;
      const targetH =
        currentDetent === 'partial' && freeRestHeightRef.current !== null
          ? Math.min(Math.max(metrics.peekHeightPx, metrics.stageHeightPx), freeRestHeightRef.current)
          : resolveDetentTargetHeight(currentDetent, metrics);
      syncSheetProperties(targetH, currentDetent, metrics);
    });
  }, [measureMetrics, syncSheetProperties]);

  const startDrag = (clientY: number) => {
    const metrics = measureMetrics();
    const partialH = resolveDetentTargetHeight('partial', metrics);
    setIsDraggingState(true);
    dragStartRef.current = {
      startY: clientY,
      startHeight: readDetentSheetHeightPx(sheetRef.current, partialH),
      startDetent: detentStateRef.current,
      isFullScreen: isFullScreenRef.current,
      isDragging: true,
      hasMoved: false,
    };
  };

  const onDragMove = (clientY: number, e?: { cancelable?: boolean; preventDefault?: () => void }) => {
    if (!dragStartRef.current?.isDragging) return;
    if (Math.abs(clientY - dragStartRef.current.startY) > DRAG_MOVE_THRESHOLD_PX) {
      dragStartRef.current.hasMoved = true;
    }
    const metrics = metricsRef.current;
    const partialH = resolveDetentTargetHeight('partial', metrics);
    const step = computeSheetDragStep({
      startHeightPx: dragStartRef.current.startHeight,
      startClientY: dragStartRef.current.startY,
      currentClientY: clientY,
      viewportHeightPx: metrics.stageHeightPx,
      peekHeightPx: metrics.peekHeightPx,
      partialHeightPx: partialH,
      isFullScreen: dragStartRef.current.isFullScreen,
      scrollTop: sheetRef.current ? sheetRef.current.scrollTop : 0,
    });
    if (step.shouldPreventScroll && e?.cancelable && e.preventDefault) e.preventDefault();
    syncSheetProperties(step.nextHeightPx, step.effectiveDetent, metrics);
    if (step.effectiveDetent !== detentStateRef.current) {
      detentStateRef.current = step.effectiveDetent;
      setDetentState(step.effectiveDetent);
    }
    if (step.isFullScreen !== isFullScreenRef.current) {
      isFullScreenRef.current = step.isFullScreen;
      setIsFullScreenState(step.isFullScreen);
    }
  };

  const endDrag = () => {
    if (!dragStartRef.current?.isDragging) return;
    const { hasMoved, startDetent } = dragStartRef.current;
    dragStartRef.current.isDragging = false;
    dragStartRef.current = null;
    setIsDraggingState(false);

    if (hasMoved) {
      lastDragEndAtRef.current = Date.now();
      const metrics = metricsRef.current;
      const partialH = resolveDetentTargetHeight('partial', metrics);
      const snap = computeSheetReleaseSnap({
        heightPx: readDetentSheetHeightPx(sheetRef.current, partialH),
        viewportHeightPx: metrics.stageHeightPx,
        peekHeightPx: metrics.peekHeightPx,
        partialHeightPx: partialH,
      });
      freeRestHeightRef.current =
        snap.detent === 'partial' && snap.snappedHeightPx > partialH + 4 ? snap.snappedHeightPx : null;
      detentStateRef.current = snap.detent;
      isFullScreenRef.current = snap.isFullScreen;
      syncSheetProperties(snap.snappedHeightPx, snap.detent, metrics);
      setDetentState(snap.detent);
      setIsFullScreenState(snap.isFullScreen);
      if (snap.detent !== startDetent) onDetentChange?.(snap.detent);
    }
  };

  const applyTapDetent = (nextDetent: DetentLevel) => {
    freeRestHeightRef.current = null;
    detentStateRef.current = nextDetent;
    isFullScreenRef.current = nextDetent === 'full';
    const metrics = measureMetrics();
    syncSheetProperties(resolveDetentTargetHeight(nextDetent, metrics), nextDetent, metrics);
    setDetentState(nextDetent);
    setIsFullScreenState(nextDetent === 'full');
    onDetentChange?.(nextDetent);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startDrag(e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.isDragging) onDragMove(e.clientY, e);
  };

  const handlePointerRelease = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current?.isDragging) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    endDrag();
  };

  const isRecentDrag = () => Date.now() - lastDragEndAtRef.current < DRAG_CLICK_GUARD_MS;

  return {
    sheetRef,
    dragHandleRef,
    peekSectionRef,
    detentState,
    detentStateRef,
    isFullScreenState,
    isDraggingState,
    isBeyondPartialState,
    peekHeightPxState,
    applyTapDetent,
    handlePointerDown,
    handlePointerMove,
    handlePointerRelease,
    isRecentDrag,
  };
}
