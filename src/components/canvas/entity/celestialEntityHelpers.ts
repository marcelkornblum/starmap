import * as THREE from 'three';
import { calculateKeplerianPosition, calculateKeplerianVelocity } from '../math/kepler';
import type { SpatialEntityDefinition } from '../../../types/spatial';
import type { CelestialEntityProps } from './CelestialEntity';

export function arePositionsEqual(
  a?: [number, number, number] | THREE.Vector3,
  b?: [number, number, number] | THREE.Vector3,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ax = a instanceof THREE.Vector3 ? a.x : a[0];
  const ay = a instanceof THREE.Vector3 ? a.y : a[1];
  const az = a instanceof THREE.Vector3 ? a.z : a[2];
  const bx = b instanceof THREE.Vector3 ? b.x : b[0];
  const by = b instanceof THREE.Vector3 ? b.y : b[1];
  const bz = b instanceof THREE.Vector3 ? b.z : b[2];
  return ax === bx && ay === by && az === bz;
}

export function areOrbitsEqual(
  a?: SpatialEntityDefinition['orbit'],
  b?: SpatialEntityDefinition['orbit'],
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.primaryEntityId === b.primaryEntityId &&
    a.semiMajorAxis === b.semiMajorAxis &&
    a.eccentricity === b.eccentricity &&
    a.inclination === b.inclination &&
    a.ascendingNode === b.ascendingNode &&
    a.argumentOfPeriapsis === b.argumentOfPeriapsis &&
    a.meanAnomaly === b.meanAnomaly &&
    a.color === b.color &&
    a.lineStyle === b.lineStyle &&
    a.showPeriapsisTick === b.showPeriapsisTick &&
    a.showDirectionArrow === b.showDirectionArrow &&
    arePositionsEqual(a.primaryPosition, b.primaryPosition)
  );
}

export function areCelestialEntityPropsEqual(
  prev: CelestialEntityProps,
  next: CelestialEntityProps,
): boolean {
  if (
    prev.id !== next.id ||
    prev.name !== next.name ||
    prev.classification !== next.classification ||
    prev.spectralType !== next.spectralType ||
    prev.multiplicity !== next.multiplicity ||
    prev.stateOverride !== next.stateOverride ||
    prev.debugHitarea !== next.debugHitarea ||
    prev.onClick !== next.onClick ||
    prev.onDoubleClick !== next.onDoubleClick ||
    prev.onPointerOver !== next.onPointerOver ||
    prev.onPointerOut !== next.onPointerOut ||
    prev.bodyRadius !== next.bodyRadius ||
    prev.bodyMinPixelSize !== next.bodyMinPixelSize ||
    prev.bodyFadeRange !== next.bodyFadeRange ||
    prev.children !== next.children
  ) {
    return false;
  }

  if (
    !arePositionsEqual(prev.position, next.position) ||
    !arePositionsEqual(prev.velocity, next.velocity) ||
    !areOrbitsEqual(prev.orbit, next.orbit)
  ) {
    return false;
  }

  const prevLen = prev.planets?.length ?? 0;
  const nextLen = next.planets?.length ?? 0;
  if (prevLen !== nextLen) {
    return false;
  }
  if (prev.planets && next.planets) {
    for (let i = 0; i < prevLen; i++) {
      const p = prev.planets[i];
      const n = next.planets[i];
      if (p.id !== n.id || p.name !== n.name || p.classification !== n.classification) {
        return false;
      }
    }
  }

  return true;
}

export function resolvePrimaryEntityPosition(
  primaryEntityPos: [number, number, number] | THREE.Vector3 | null,
  orbitPrimaryPos: [number, number, number] | THREE.Vector3 | null,
): THREE.Vector3 {
  if (primaryEntityPos) {
    return primaryEntityPos instanceof THREE.Vector3
      ? primaryEntityPos.clone()
      : new THREE.Vector3(primaryEntityPos[0], primaryEntityPos[1], primaryEntityPos[2]);
  }
  if (orbitPrimaryPos) {
    return orbitPrimaryPos instanceof THREE.Vector3
      ? orbitPrimaryPos.clone()
      : new THREE.Vector3(orbitPrimaryPos[0], orbitPrimaryPos[1], orbitPrimaryPos[2]);
  }
  return new THREE.Vector3(0, 0, 0);
}

export function resolveKeplerianEntityPosition(
  position: [number, number, number] | THREE.Vector3 | null | undefined,
  orbit: SpatialEntityDefinition['orbit'] | undefined,
  resolvedPrimaryPos: THREE.Vector3,
): THREE.Vector3 {
  const orbitA = orbit?.semiMajorAxis;
  const rawPosX = position ? (position instanceof THREE.Vector3 ? position.x : position[0]) : null;
  const rawPosY = position ? (position instanceof THREE.Vector3 ? position.y : position[1]) : null;
  const rawPosZ = position ? (position instanceof THREE.Vector3 ? position.z : position[2]) : null;

  if (orbit && orbitA !== undefined && (orbit.meanAnomaly !== undefined || rawPosX === null)) {
    const [ox, oy, oz] = calculateKeplerianPosition(
      orbitA,
      orbit.eccentricity ?? 0,
      orbit.inclination ?? 0,
      orbit.ascendingNode ?? 0,
      orbit.argumentOfPeriapsis ?? 0,
      orbit.meanAnomaly ?? 0,
    );
    return new THREE.Vector3(
      resolvedPrimaryPos.x + ox,
      resolvedPrimaryPos.y + oy,
      resolvedPrimaryPos.z + oz,
    );
  }

  if (rawPosX !== null && rawPosY !== null && rawPosZ !== null) {
    return new THREE.Vector3(rawPosX, rawPosY, rawPosZ);
  }

  return new THREE.Vector3(0, 0, 0);
}

export function resolveEntityVelocity(
  velocity: [number, number, number] | THREE.Vector3 | undefined,
  orbit: SpatialEntityDefinition['orbit'] | undefined,
): THREE.Vector3 | undefined {
  if (velocity) {
    return velocity instanceof THREE.Vector3
      ? velocity.clone()
      : new THREE.Vector3(velocity[0], velocity[1], velocity[2]);
  }
  if (orbit?.semiMajorAxis !== undefined && orbit.meanAnomaly !== undefined) {
    const [vx, vy, vz] = calculateKeplerianVelocity(
      orbit.semiMajorAxis,
      orbit.eccentricity ?? 0,
      orbit.inclination ?? 0,
      orbit.ascendingNode ?? 0,
      orbit.argumentOfPeriapsis ?? 0,
      orbit.meanAnomaly,
    );
    return new THREE.Vector3(vx, vy, vz);
  }
  return undefined;
}

export function calculateOrbitOffset(
  resolvedPrimaryPos: THREE.Vector3,
  resolvedPos: THREE.Vector3,
): [number, number, number] {
  const ox = resolvedPrimaryPos.x - resolvedPos.x;
  const oy = resolvedPrimaryPos.y - resolvedPos.y;
  const oz = resolvedPrimaryPos.z - resolvedPos.z;
  return [
    Math.abs(ox) < 1e-6 ? 0 : ox,
    Math.abs(oy) < 1e-6 ? 0 : oy,
    Math.abs(oz) < 1e-6 ? 0 : oz,
  ];
}
