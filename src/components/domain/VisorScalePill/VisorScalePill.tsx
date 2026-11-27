import React, { memo, useEffect, useMemo, useState } from 'react';
import { useLiveCameraPose } from '../../../hooks/useLiveCameraPose';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import { useCameraStore } from '../../../stores/useCameraStore';
import {
  FRAME_BY_SCOPE,
  formatDistanceValue,
  resolveEffectiveCameraOrientation,
} from '../../../utils/orientationProjectionMath';
import { Button, Quantity, Unit } from '../../interface';
import styles from './VisorScalePill.module.css';

const MOBILE_VIEWPORT_MAX_WIDTH_PX = 767;
const MOBILE_VIEWPORT_MEDIA_QUERY = `(max-width: ${MOBILE_VIEWPORT_MAX_WIDTH_PX}px)`;

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

export interface VisorScalePillProps {
  readonly orientation: MinimapOrientationSummary | null;
}

export const VisorScalePill = memo(function VisorScalePill({
  orientation,
}: VisorScalePillProps): React.ReactElement | null {
  const isMobileViewport = useIsMobileViewport();
  const livePose = useLiveCameraPose(orientation !== null && isMobileViewport);

  const effectiveCamera = useMemo(
    () => resolveEffectiveCameraOrientation(orientation, livePose),
    [orientation, livePose],
  );

  if (!orientation || !effectiveCamera) {
    return null;
  }

  const unit = FRAME_BY_SCOPE[orientation.scope].unit;

  return (
    <div className={styles.visorScalePill}>
      <Button
        variant="subtle"
        size="sm"
        onClick={() => useCameraStore.getState().setRadialView()}
        aria-label="Reset camera orientation to North"
        data-testid="visor-scale-pill"
      >
        <Quantity
          value={formatDistanceValue(effectiveCamera.distance)}
          unit={<Unit>{unit}</Unit>}
          data-testid="visor-focal-distance"
        />
        <span className={styles.attitudeCue} data-testid="visor-attitude-cue">
          N▲ {Math.round(effectiveCamera.basis.elevationDeg)}°
        </span>
      </Button>
    </div>
  );
});

VisorScalePill.displayName = 'VisorScalePill';
