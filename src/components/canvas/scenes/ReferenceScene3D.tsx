import type React from 'react';
import { Box } from '@react-three/drei';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';

export interface ReferenceScene3DProps {}

export const ReferenceScene3D: React.FC<ReferenceScene3DProps> = () => {
  const datumPlaneMajorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMajorColor);
  const datumPlaneMinorColor = useThreeTokenStore((s) => s.tokens.datumPlaneMinorColor);
  const stateFocus = useThreeTokenStore((s) => s.tokens.stateFocus);

  return (
    <group data-testid="reference-scene-3d">
      {/* Reference Coordinate Grid Geometry */}
      <gridHelper args={[10, 10, datumPlaneMajorColor, datumPlaneMinorColor]} />

      {/* Origin Marker */}
      <Box args={[0.5, 0.5, 0.5]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color={stateFocus} wireframe />
      </Box>
    </group>
  );
};
