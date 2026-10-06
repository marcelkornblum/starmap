import type React from 'react';
import { Sphere } from '@react-three/drei';

export interface GalaxyScene3DProps {}

export const GalaxyScene3D: React.FC<GalaxyScene3DProps> = () => {
  return (
    <group data-testid="galaxy-scene-3d">
      {/* Central galactic core placeholder */}
      <Sphere args={[1.5, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#88aaff" emissive="#3355aa" roughness={0.3} wireframe />
      </Sphere>

      {/* Outer galactic cluster markers */}
      <mesh position={[4, 1, -2]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#ffaa44" />
      </mesh>
      <mesh position={[-3, -2, 1]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#44ffaa" />
      </mesh>
      <mesh position={[2, -3, -3]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ff4488" />
      </mesh>
    </group>
  );
};
