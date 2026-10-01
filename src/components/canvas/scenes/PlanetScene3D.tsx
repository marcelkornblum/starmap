import type React from 'react';
import { Sphere } from '@react-three/drei';

export interface PlanetScene3DProps {
  planetId: string;
}

export const PlanetScene3D: React.FC<PlanetScene3DProps> = ({ planetId }) => {
  return (
    <group data-testid="planet-scene-3d">
      {/* Planetary Body */}
      <Sphere args={[2.0, 64, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#2277bb" roughness={0.6} metalness={0.1} />
      </Sphere>

      {/* Atmospheric Haze Layer */}
      <Sphere args={[2.08, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#66ccff" transparent opacity={0.25} wireframe />
      </Sphere>

      {/* Orbital Moon */}
      <group position={[3.8, 0.8, -0.5]}>
        <Sphere args={[0.4, 32, 32]}>
          <meshStandardMaterial color="#aaaaaa" roughness={0.9} />
        </Sphere>
      </group>

      <group position={[0, 2.5, 0]} name={`planet-anchor-${planetId}`} />
    </group>
  );
};
