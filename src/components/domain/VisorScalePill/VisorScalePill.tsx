import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveCameraPose } from '../../../hooks/useLiveCameraPose';
import {
  useOptionalRouter,
  type AppRouterAdapter,
  type StarmapSearchParams,
} from '../../../hooks/useSpaLocation';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import {
  ALL_CANVAS_CLAMP_EDGES,
  useCameraStore,
} from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { toUrlSlug } from '../../../utils/datasetLayerSlugs';
import {
  FRAME_BY_SCOPE,
  formatDistanceValue,
  resolveEffectiveCameraOrientation,
} from '../../../utils/orientationProjectionMath';
import { Button, Quantity, Unit } from '../../interface';
import {
  formatCompactTargetCoords,
  resolveEffectiveTargetCoords,
  resolveVisorPillAriaLabel,
  resolveVisorPillNextAction,
} from './visorScalePillHelpers';
import styles from './VisorScalePill.module.css';

const MOBILE_VIEWPORT_MAX_WIDTH_PX = 767;
const MOBILE_VIEWPORT_MEDIA_QUERY = `(max-width: ${MOBILE_VIEWPORT_MAX_WIDTH_PX}px)`;

type SearchParamRecord = StarmapSearchParams & Record<string, unknown>;

function readIsMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_VIEWPORT_MEDIA_QUERY).matches;
  }
  return window.innerWidth <= MOBILE_VIEWPORT_MAX_WIDTH_PX;
}

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(readIsMobileViewport);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setIsMobile(readIsMobileViewport());
    sync();

    if (typeof window.matchMedia === 'function') {
      const mql = window.matchMedia(MOBILE_VIEWPORT_MEDIA_QUERY);
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', sync);
        return () => mql.removeEventListener('change', sync);
      }
    }

    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return isMobile;
}

function hasAnySearchParam(
  router: AppRouterAdapter | undefined,
  keys: readonly string[],
): boolean {
  if (!router || typeof router.navigate !== 'function') return false;
  const searchObj = router.state?.location?.search as SearchParamRecord | undefined;
  if (searchObj) {
    return keys.some((key) => searchObj[key] !== undefined);
  }
  const searchStr = router.state?.location?.searchStr;
  if (typeof searchStr === 'string' && searchStr.length > 0) {
    const params = new URLSearchParams(searchStr);
    return keys.some((key) => params.has(key));
  }
  return router.state === undefined;
}

function readCurrentFocusParam(router: AppRouterAdapter | undefined): string | null {
  const searchObj = router?.state?.location?.search as SearchParamRecord | undefined;
  if (typeof searchObj?.focus === 'string' && searchObj.focus.length > 0) {
    return searchObj.focus;
  }
  const searchStr = router?.state?.location?.searchStr;
  if (typeof searchStr === 'string' && searchStr.length > 0) {
    const focus = new URLSearchParams(searchStr).get('focus');
    if (focus && focus.length > 0) return focus;
  }
  return null;
}

function recordFocusValue(focusVal: string): void {
  const slug = toUrlSlug(focusVal);
  useCameraStore.getState().recordCanvasFocus(slug ? [slug, focusVal] : [focusVal]);
}

function stripSearchParams(
  router: AppRouterAdapter | undefined,
  keys: readonly string[],
  recordFocusBeforeStrip = false,
): void {
  if (!router || typeof router.navigate !== 'function') return;
  if (recordFocusBeforeStrip) {
    const currentFocus = readCurrentFocusParam(router);
    if (currentFocus) {
      recordFocusValue(currentFocus);
    }
  }
  if (!hasAnySearchParam(router, keys)) return;

  void Promise.resolve(
    router.navigate({
      to: '.',
      search: (prev: SearchParamRecord = {}) => {
        if (
          recordFocusBeforeStrip &&
          typeof prev.focus === 'string' &&
          prev.focus.length > 0
        ) {
          recordFocusValue(prev.focus);
        }
        const next: SearchParamRecord = { ...prev };
        for (const key of keys) {
          delete next[key];
        }
        return next;
      },
      replace: true,
    }),
  ).catch(() => {});
}

export interface VisorScalePillProps {
  readonly orientation: MinimapOrientationSummary | null;
}

export const VisorScalePill = memo(function VisorScalePill({
  orientation,
}: VisorScalePillProps): React.ReactElement | null {
  const router = useOptionalRouter();
  const isMobileViewport = useIsMobileViewport();
  const livePose = useLiveCameraPose(orientation !== null && isMobileViewport);
  const isLocked = useCameraStore((s) => s.isLocked);
  const mode = useCameraStore((s) => s.mode);
  const isCameraTransitioning = useUIStore((s) => s.isCameraTransitioning);
  const inFlightStepRef = useRef<'reorient' | 'reset-zoom' | 'reset-position' | null>(null);

  useEffect(() => {
    if (!isCameraTransitioning) {
      inFlightStepRef.current = null;
    }
  }, [isCameraTransitioning]);

  const effectiveCamera = useMemo(
    () => resolveEffectiveCameraOrientation(orientation, livePose),
    [orientation, livePose],
  );

  const effectiveTarget = useMemo(
    () => (orientation ? resolveEffectiveTargetCoords(orientation, livePose) : null),
    [orientation, livePose],
  );

  const nextAction = useMemo(() => {
    if (!orientation || !effectiveCamera) return null;
    return resolveVisorPillNextAction({
      orientation,
      effectiveCamera,
      livePose,
      isLocked,
      mode,
    });
  }, [orientation, effectiveCamera, livePose, isLocked, mode]);

  const handlePillClick = useCallback(() => {
    if (!orientation || !nextAction) return;
    const freshStore = useCameraStore.getState();
    const freshLivePose = {
      position: freshStore.position,
      target: freshStore.target,
      up: freshStore.up,
      focalDistance: freshStore.focalDistance,
      zoom: freshStore.zoom,
    };
    const activeInFlightStep = useUIStore.getState().isCameraTransitioning
      ? inFlightStepRef.current
      : null;
    const freshEffectiveCamera = resolveEffectiveCameraOrientation(orientation, freshLivePose);
    const action = freshEffectiveCamera
      ? resolveVisorPillNextAction({
          orientation,
          effectiveCamera: freshEffectiveCamera,
          livePose: freshLivePose,
          isLocked: freshStore.isLocked,
          mode: freshStore.mode,
          inFlightStep: activeInFlightStep,
        })
      : nextAction;

    switch (action) {
      case 'reorient':
        inFlightStepRef.current = 'reorient';
        stripSearchParams(router, ['az', 'el']);
        freshStore.setRadialView();
        break;
      case 'reset-zoom':
        inFlightStepRef.current = 'reset-zoom';
        stripSearchParams(router, ['dist', 'zoom']);
        freshStore.resetZoom();
        break;
      case 'reset-position':
        inFlightStepRef.current = 'reset-position';
        stripSearchParams(router, ['center', 'x', 'y', 'z'], true);
        freshStore.resetPosition();
        break;
      case 'all-ready':
        freshStore.triggerClampBump(ALL_CANVAS_CLAMP_EDGES, 'zoom-out', 0.85);
        break;
    }
  }, [orientation, nextAction, router]);

  if (!orientation || !effectiveCamera || !effectiveTarget || !nextAction) {
    return null;
  }

  const unit = FRAME_BY_SCOPE[orientation.scope].unit;
  const ariaLabel = resolveVisorPillAriaLabel(nextAction);

  return (
    <div className={styles.visorScalePill}>
      <Button
        variant="subtle"
        size="sm"
        onClick={handlePillClick}
        aria-label={ariaLabel}
        data-next-action={nextAction}
        data-testid="visor-scale-pill"
      >
        <span className={styles.positionCue} data-testid="visor-position">
          {formatCompactTargetCoords(effectiveTarget)}
        </span>
        <Quantity
          value={formatDistanceValue(effectiveCamera.distance)}
          unit={<Unit>{unit}</Unit>}
          data-testid="visor-focal-distance"
        />
        <span className={styles.attitudeCue} data-testid="visor-attitude-cue">
          N▲ {Math.round(effectiveCamera.basis.elevationDeg) || 0}°
        </span>
      </Button>
    </div>
  );
});

VisorScalePill.displayName = 'VisorScalePill';
