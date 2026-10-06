import {
  CARTO_LINE_CONSTANTS,
  CartoHairlineMaterial,
  type CartoLineMaterialParameters,
  type CartoLineStyle,
} from '../materials/CartoLineMaterial';

export {
  CartoLineMaterial,
  CartoHairlineMaterial,
} from '../materials/CartoLineMaterial';

export const SCREEN_SPACE_LINE_CONSTANTS = CARTO_LINE_CONSTANTS;

export interface ScreenSpaceLineMaterialParameters extends CartoLineMaterialParameters {
  lineStyle?: CartoLineStyle;
}

/**
 * ScreenSpaceLineMaterial is a thin wrapper over CartoHairlineMaterial
 * providing full backward compatibility for existing callers.
 */
export class ScreenSpaceLineMaterial extends CartoHairlineMaterial {
  constructor(params: ScreenSpaceLineMaterialParameters = {}) {
    super(params);
  }
}
