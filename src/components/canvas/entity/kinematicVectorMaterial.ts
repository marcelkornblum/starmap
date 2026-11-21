import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { CARTO_LINE_CONSTANTS } from '../../../styles/tokens/cartography';
import { CartoLineMaterial } from '../materials/CartoLineMaterial';

let sharedKinematicLineMaterial: CartoLineMaterial | null = null;

/**
 * Shared CartoLineMaterial for all active KinematicVector instances.
 * All active instances consume identical global kinematic tokens (kinematicColor, kinematicAlpha),
 * dash constants, and viewport resolution; therefore one shared material avoids redundant shader
 * allocations and is intentionally retained across individual unmounts.
 */
export function getSharedKinematicLineMaterial(): CartoLineMaterial {
  if (!sharedKinematicLineMaterial) {
    const { kinematicColor, kinematicAlpha } = useThreeTokenStore.getState().tokens;
    sharedKinematicLineMaterial = new CartoLineMaterial({
      color: kinematicColor,
      opacity: kinematicAlpha,
      lineWidth: 2.0,
      lineStyle: 'dashed',
      dashSize: CARTO_LINE_CONSTANTS.dashSize,
      gapSize: CARTO_LINE_CONSTANTS.gapSize,
      transparent: true,
      depthWrite: false,
    });
  }
  return sharedKinematicLineMaterial;
}

export function clearSharedKinematicLineMaterial(): void {
  sharedKinematicLineMaterial?.dispose();
  sharedKinematicLineMaterial = null;
}
