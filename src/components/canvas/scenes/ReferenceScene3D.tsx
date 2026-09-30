import type React from 'react';
import { Box } from '@react-three/drei';

export interface ReferenceScene3DProps {}

export const ReferenceScene3D: React.FC<ReferenceScene3DProps> = () => {
  return (
    <group data-testid="reference-scene-3d">
      {/* Reference Coordinate Grid Geometry */}
      <gridHelper args={[10, 10, '#00ffff', '#334455']} />

      {/* Origin Marker */}
      <Box args={[0.5, 0.5, 0.5]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#00ffcc" wireframe />
      </Box>
    </group>
  );
};
