import type React from 'react';
import { Sphere } from '@react-three/drei';

export interface SystemScene3DProps {
  systemId: string;
}

export const SystemScene3D: React.FC<SystemScene3DProps> = ({ systemId }) => {
  return (
    <group data-testid="system-scene-3d">
      {/* Central Star */}
      <Sphere args={[1.2, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffcc00" emissive="#ff8800" roughness={0.1} />
      </Sphere>

      {/* Orbit Ring 1 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.9, 3.0, 64]} />
        <meshBasicMaterial color="#556677" side={2} />
      </mesh>
      {/* Planet in Orbit 1 */}
      <Sphere args={[0.3, 16, 16]} position={[3, 0, 0]}>
        <meshStandardMaterial color="#4488ff" />
      </Sphere>

      {/* Orbit Ring 2 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.4, 5.5, 64]} />
        <meshBasicMaterial color="#556677" side={2} />
      </mesh>
      {/* Planet in Orbit 2 */}
      <Sphere args={[0.5, 16, 16]} position={[-5.45, 0, 0]}>
        <meshStandardMaterial color="#ff8844" />
      </Sphere>

      {/* Star identity label anchor */}
      <group position={[0, 2, 0]} name={`label-${systemId}`} />
    </group>
  );
};
