import React, { memo, useId, useMemo } from 'react';
import { useLiveCameraPose } from '../../../hooks/useLiveCameraPose';
import { useSpaLinkClick } from '../../../hooks/spaNavigation';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import {
  FRAME_BY_SCOPE,
  formatDistanceValue,
  resolveEffectiveCameraOrientation,
} from '../../../utils/orientationProjectionMath';
import { resolveAppHref } from '../../../utils/url';
import { Heading, Quantity, Unit } from '../../interface';
import {
  SVG_HEIGHT,
  SVG_WIDTH,
  ZOOM_TRACK_WIDTH,
  buildMinimapProjection,
  computeZoomBarFillWidth,
} from './minimapHudHelpers';
import styles from './Minimap.module.css';

export interface MinimapProps {
  readonly orientation: MinimapOrientationSummary | null;
}

export const Minimap = memo(function Minimap({
  orientation,
}: MinimapProps): React.ReactElement | null {
  const headingId = useId();
  const handleSpaLinkClick = useSpaLinkClick();
  const livePose = useLiveCameraPose(orientation !== null);

  const effectiveCamera = useMemo(
    () => resolveEffectiveCameraOrientation(orientation, livePose),
    [orientation, livePose],
  );

  const geometry = useMemo(
    () =>
      orientation && effectiveCamera
        ? buildMinimapProjection(
            orientation,
            effectiveCamera.basis,
            effectiveCamera.distance,
          )
        : null,
    [orientation, effectiveCamera],
  );

  if (!orientation || !effectiveCamera || !geometry) {
    return null;
  }

  const { scope, anchorId, systemId, markers } = orientation;
  const { distance } = effectiveCamera;
  const unit = FRAME_BY_SCOPE[scope].unit;
  const fillWidth = computeZoomBarFillWidth(scope, distance);

  return (
    <section
      className={styles.minimapPanel}
      aria-labelledby={headingId}
      data-testid="minimap-panel"
      data-scope={scope}
      data-anchor-id={anchorId}
      data-system-id={systemId}
    >
      <Heading as="h2" id={headingId} visuallyHidden>
        Minimap
      </Heading>
      <div
        className={styles.viewportSlot}
        data-testid="minimap-viewport-slot"
        data-scope={scope}
        data-anchor-id={anchorId}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className={styles.hudSvg}
          role="img"
          aria-label="Galactic frame orientation minimap"
        >
          {/* Zoomed-in Polar Sector of the Sparse Galactic Frame (origin at Galactic Core) */}
          <polygon points={geometry.sectorPolygon} className={styles.galacticSector} />
          <path d={geometry.midInnerArcPath} className={styles.galacticArc} />
          <path d={geometry.midOuterArcPath} className={styles.galacticArc} />
          <path d={geometry.midArcPath} className={styles.solarCircleArc} strokeDasharray="2 3" />

          {/* Sparse Converging Galactocentric Radials Pointing Toward Galactic Core */}
          {geometry.sparseRadials.map((radial, idx) => (
            <line
              key={idx}
              x1={radial.outPt.x}
              y1={radial.outPt.y}
              x2={radial.inPt.x}
              y2={radial.inPt.y}
              className={styles.coreRadial}
              strokeDasharray="2 3"
            />
          ))}

          {/* Inward CORE Bearing Vector */}
          <line
            x1={geometry.coreVecStart.x}
            y1={geometry.coreVecStart.y}
            x2={geometry.coreVecTip.x}
            y2={geometry.coreVecTip.y}
            className={styles.toCoreVector}
          />
          {geometry.coreVecArrow ? (
            <polygon points={geometry.coreVecArrow} className={styles.toCoreArrow} />
          ) : null}
          <text x={geometry.coreLabelPos.x} y={geometry.coreLabelPos.y} className={styles.coreLabel}>
            CORE
          </text>

          {/* Curved ORB Rotation Vector Along Galactic Arc */}
          <path d={geometry.orbArcPath} className={styles.orbArc} />
          {geometry.orbArrow ? (
            <polygon points={geometry.orbArrow} className={styles.orbArrow} />
          ) : null}
          <text x={geometry.orbLabelPos.x} y={geometry.orbLabelPos.y} className={styles.orbLabel}>
            ORB
          </text>

          {/* Z-Offset Stalk When Current Position Sits Above/Below Galactic Midplane */}
          {geometry.hasPlaneZOffset ? (
            <line
              x1={geometry.observerPos.x}
              y1={geometry.observerPos.y}
              x2={geometry.observerPlaneFootprint.x}
              y2={geometry.observerPlaneFootprint.y}
              className={styles.zStalk}
            />
          ) : null}

          {/* Perpendicular North (+Z) Stalk Normal to Galactic Plane */}
          <line
            x1={geometry.observerPlaneFootprint.x}
            y1={geometry.observerPlaneFootprint.y}
            x2={geometry.northStalkTip.x}
            y2={geometry.northStalkTip.y}
            className={styles.northStalk}
          />
          <circle cx={geometry.northStalkTip.x} cy={geometry.northStalkTip.y} r={1.6} className={styles.northTipDot} />
          <text x={geometry.northLabelPos.x} y={geometry.northLabelPos.y} className={styles.northLabel}>
            N
          </text>

          {/* Framed Current Position & Zoom-Coupled Local Footprint Ring */}
          <polygon points={geometry.localViewportPolygon} className={styles.localViewportRing} strokeDasharray="3 2" />
          <circle cx={geometry.observerPos.x} cy={geometry.observerPos.y} r={2.1} className={styles.observerDot} />
        </svg>

        <div className={styles.zoomRow} data-telemetry="true" data-testid="minimap-telemetry">
          <svg viewBox={`0 0 ${ZOOM_TRACK_WIDTH} 4`} className={styles.zoomBarSvg} aria-hidden="true" data-testid="minimap-zoom-bar">
            <rect x="0" y="1" width={ZOOM_TRACK_WIDTH} height="2" rx="1" className={styles.zoomTrack} />
            <rect x="0" y="1" width={fillWidth} height="2" rx="1" className={styles.zoomFill} />
          </svg>
          <span className={styles.focalDistance} data-testid="minimap-focal-distance">
            <Quantity value={formatDistanceValue(distance)} unit={<Unit>{unit}</Unit>} />
          </span>
        </div>

        {markers.length > 0 ? (
          <div className={styles.srOnlyMarkers}>
            {markers.map((marker) => (
              <span
                key={`${marker.id}-${marker.role}`}
                data-testid="minimap-marker-item"
                data-marker-id={marker.id}
                data-marker-role={marker.role}
              >
                <a
                  href={resolveAppHref(marker.href)}
                  onClick={(e) => handleSpaLinkClick(e, marker.href)}
                  data-testid="minimap-marker-link"
                >
                  {marker.name}
                </a>
                <span data-testid="minimap-marker-role">{marker.role}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
});

Minimap.displayName = 'Minimap';
