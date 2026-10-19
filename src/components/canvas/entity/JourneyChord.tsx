import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import {
  CartoLineMaterial,
  CartoHairlineMaterial,
  createCartoLineGeometry,
} from '../materials/CartoLineMaterial';
import { SafeHtml } from '../SafeHtml';
import { calculateScreenInvariantScale } from '../engineConfig';
import {
  buildJourneyChordRenderData,
  type JourneyChordLeg,
  type JourneyChordLegGeometryData,
  type JourneyChordWaypoint,
} from '../cartography/journeyChordGeometry';
import styles from './JourneyChord.module.css';

export interface JourneyChordProps {
  readonly legs?: readonly JourneyChordLeg[];
  readonly activeMethodId?: string;
  readonly showElevationProjection?: boolean;
  readonly showLabels?: boolean;
  readonly visible?: boolean;
  readonly className?: string;
}

interface JourneyChordLegViewProps {
  readonly leg: JourneyChordLegGeometryData;
  readonly routeColor: THREE.Color;
  readonly routeAlpha: number;
  readonly routeWidth: number;
  readonly routeStyle: 'solid' | 'dashed' | 'dotted';
  readonly stalkSelectedColor: THREE.Color;
  readonly stalkSelectedAlpha: number;
  readonly showElevationProjection: boolean;
  readonly showLabels: boolean;
}

const JourneyChordLegView: React.FC<JourneyChordLegViewProps> = ({
  leg,
  routeColor,
  routeAlpha,
  routeWidth,
  routeStyle,
  stalkSelectedColor,
  stalkSelectedAlpha,
  showElevationProjection,
  showLabels,
}) => {
  const lineGeom = useMemo(() => {
    return createCartoLineGeometry(Array.from(leg.positions));
  }, [leg.positions]);

  const lineMat = useMemo(() => {
    return new CartoLineMaterial({
      color: routeColor,
      opacity: routeAlpha,
      lineWidth: routeWidth > 0 ? routeWidth : 2.0,
      lineStyle: leg.lineStyle ?? routeStyle,
      transparent: true,
      depthWrite: false,
    });
    // Keep shader material instance stable; mutate properties in useEffect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    lineMat.setColor(routeColor);
    lineMat.setOpacity(routeAlpha);
    lineMat.setLineWidth(routeWidth > 0 ? routeWidth : 2.0);
    lineMat.setStyle(leg.lineStyle ?? routeStyle);
  }, [lineMat, routeColor, routeAlpha, routeWidth, leg.lineStyle, routeStyle]);

  const line2Mesh = useMemo(() => {
    const mesh = new Line2(lineGeom, lineMat);
    mesh.computeLineDistances();
    return mesh;
  }, [lineGeom, lineMat]);

  useEffect(() => {
    return () => {
      lineGeom.dispose();
      lineMat.dispose();
    };
  }, [lineGeom, lineMat]);

  useFrame(({ camera, size }) => {
    lineMat.updateResolution(camera, size.width, size.height);
  });

  const projGeom = useMemo(() => {
    if (!showElevationProjection || !leg.elevationProjectionSegments) {
      return null;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(Array.from(leg.elevationProjectionSegments), 3),
    );
    return geom;
  }, [showElevationProjection, leg.elevationProjectionSegments]);

  const projMat = useMemo(() => {
    return new CartoHairlineMaterial({
      color: stalkSelectedColor,
      opacity: stalkSelectedAlpha,
      lineStyle: 'dashed',
      transparent: true,
      depthWrite: false,
    });
    // Keep shader material instance stable; mutate properties in useEffect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    projMat.setColor(stalkSelectedColor);
    projMat.setOpacity(stalkSelectedAlpha);
  }, [projMat, stalkSelectedColor, stalkSelectedAlpha]);

  useEffect(() => {
    return () => {
      projGeom?.dispose();
      projMat.dispose();
    };
  }, [projGeom, projMat]);

  return (
    <group
      data-testid="journey-chord-leg"
      data-leg-id={leg.id}
      data-step-index={leg.stepIndex}
    >
      <primitive object={line2Mesh} />
      {projGeom && (
        <lineSegments geometry={projGeom} material={projMat} />
      )}
      {showLabels && (
        <SafeHtml
          position={leg.midpoint as unknown as [number, number, number]}
          center
          pointerEvents="none"
        >
          <div
            className={styles.midpointCallout}
            data-testid="journey-chord-callout"
            data-step-index={leg.stepIndex}
          >
            <span className={styles.calloutDistance}>{leg.distanceLabel}</span>
            {leg.secondaryLabel ? (
              <span className={styles.calloutSecondary}>{leg.secondaryLabel}</span>
            ) : null}
          </div>
        </SafeHtml>
      )}
    </group>
  );
};

interface JourneyChordWaypointMarkerProps {
  readonly waypoint: JourneyChordWaypoint;
  readonly color: THREE.Color;
  readonly sphereGeom: THREE.SphereGeometry;
}

const JourneyChordWaypointMarker: React.FC<JourneyChordWaypointMarkerProps> = ({
  waypoint,
  color,
  sphereGeom,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const mat = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color, depthTest: true });
    // Keep material instance stable; mutate color in useEffect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mat.color.copy(color);
  }, [mat, color]);

  useEffect(() => {
    return () => {
      mat.dispose();
    };
  }, [mat]);

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    const camPos = camera.position;
    const dx = waypoint.position[0] - camPos.x;
    const dy = waypoint.position[1] - camPos.y;
    const dz = waypoint.position[2] - camPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const s = calculateScreenInvariantScale(dist, camera) * 0.15;
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={sphereGeom}
      material={mat}
      position={waypoint.position as unknown as [number, number, number]}
      data-testid="journey-chord-waypoint"
      data-waypoint-id={waypoint.id}
      data-waypoint-role={waypoint.role}
    />
  );
};

/**
 * 3D Visual Journey Chord component.
 * Renders direct trajectory line chords, elevation projections, waypoint markers,
 * and midpoint distance/time callouts for active journey routes.
 */
export const JourneyChord: React.FC<JourneyChordProps> = ({
  legs = [],
  activeMethodId,
  showElevationProjection = true,
  showLabels = true,
  visible = true,
}) => {
  const routeColor = useThreeTokenStore((s) => s.tokens.routeColor);
  const routeAlpha = useThreeTokenStore((s) => s.tokens.routeAlpha);
  const routeWidth = useThreeTokenStore((s) => s.tokens.routeWidth);
  const routeStyle = useThreeTokenStore((s) => s.tokens.routeStyle);
  const stalkSelectedColor = useThreeTokenStore((s) => s.tokens.stalkSelectedColor);
  const stalkSelectedAlpha = useThreeTokenStore((s) => s.tokens.stalkSelectedAlpha);

  const renderData = useMemo(() => {
    return buildJourneyChordRenderData(legs);
  }, [legs]);

  const sphereGeom = useMemo(() => {
    return new THREE.SphereGeometry(1, 16, 16);
  }, []);

  useEffect(() => {
    return () => {
      sphereGeom.dispose();
    };
  }, [sphereGeom]);

  if (!visible || renderData.legs.length === 0) {
    return null;
  }

  return (
    <group
      data-testid="journey-chord-root"
      data-active-method={activeMethodId}
      data-leg-count={renderData.legs.length}
      data-waypoint-count={renderData.waypoints.length}
    >
      {renderData.legs.map((leg) => (
        <JourneyChordLegView
          key={leg.id}
          leg={leg}
          routeColor={routeColor}
          routeAlpha={routeAlpha}
          routeWidth={routeWidth}
          routeStyle={routeStyle}
          stalkSelectedColor={stalkSelectedColor}
          stalkSelectedAlpha={stalkSelectedAlpha}
          showElevationProjection={showElevationProjection}
          showLabels={showLabels}
        />
      ))}
      {renderData.waypoints.map((wp) => (
        <JourneyChordWaypointMarker
          key={wp.id}
          waypoint={wp}
          color={wp.role === 'destination' ? stalkSelectedColor : routeColor}
          sphereGeom={sphereGeom}
        />
      ))}
    </group>
  );
};
