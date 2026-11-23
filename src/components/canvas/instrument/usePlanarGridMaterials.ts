import { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';

export interface FillUniforms {
  [key: string]: THREE.IUniform;
  uColor: { value: THREE.Color };
  uAlpha: { value: number };
  uInnerRadius: { value: number };
  uExponent: { value: number };
}

export interface UsePlanarGridMaterialsOptions {
  datumPlaneFillColor: string | THREE.Color;
  datumPlaneFillAlpha: number;
  datumPlaneFillGradientInner: number;
  datumPlaneFillGradientExponent: number;
  stateFocus: string | THREE.Color;
}

export interface UsePlanarGridMaterialsReturn {
  fillUniforms: FillUniforms;
  fillUniformsRef: React.RefObject<FillUniforms>;
  fillMatRef: React.RefObject<THREE.ShaderMaterial | null>;
  primaryFootprintMatRef: React.RefObject<THREE.LineBasicMaterial | null>;
  updateFillAlpha: (fadePlanar: number) => void;
}

export function usePlanarGridMaterials(options: UsePlanarGridMaterialsOptions): UsePlanarGridMaterialsReturn {
  const {
    datumPlaneFillColor,
    datumPlaneFillAlpha,
    datumPlaneFillGradientInner,
    datumPlaneFillGradientExponent,
    stateFocus,
  } = options;

  const fillUniforms = useMemo<FillUniforms>(() => ({
    uColor: { value: new THREE.Color() },
    uAlpha: { value: 0.1 },
    uInnerRadius: { value: 0.15 },
    uExponent: { value: 3.5 },
  }), []);

  const fillUniformsRef = useRef<FillUniforms>(fillUniforms);
  const fillMatRef = useRef<THREE.ShaderMaterial | null>(null);
  useLayoutEffect(() => {
    fillUniformsRef.current = fillUniforms;
  }, [fillUniforms]);

  useEffect(() => {
    fillUniformsRef.current.uColor.value.set(datumPlaneFillColor);
    fillUniformsRef.current.uAlpha.value = datumPlaneFillAlpha;
    fillUniformsRef.current.uInnerRadius.value = datumPlaneFillGradientInner;
    fillUniformsRef.current.uExponent.value = datumPlaneFillGradientExponent;
    const matUniforms = fillMatRef.current?.uniforms;
    if (matUniforms) {
      (matUniforms.uColor?.value as THREE.Color | undefined)?.set(datumPlaneFillColor);
      if (matUniforms.uAlpha) matUniforms.uAlpha.value = datumPlaneFillAlpha;
      if (matUniforms.uInnerRadius) matUniforms.uInnerRadius.value = datumPlaneFillGradientInner;
      if (matUniforms.uExponent) matUniforms.uExponent.value = datumPlaneFillGradientExponent;
    }
  }, [
    datumPlaneFillColor,
    datumPlaneFillAlpha,
    datumPlaneFillGradientInner,
    datumPlaneFillGradientExponent,
  ]);

  const primaryFootprintMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  useEffect(() => {
    if (primaryFootprintMatRef.current?.color) {
      primaryFootprintMatRef.current.color.set(stateFocus);
    }
  }, [stateFocus]);

  const updateFillAlpha = (fadePlanar: number) => {
    const nextAlpha = datumPlaneFillAlpha * fadePlanar;
    fillUniformsRef.current.uAlpha.value = nextAlpha;
    if (fillMatRef.current?.uniforms?.uAlpha) {
      fillMatRef.current.uniforms.uAlpha.value = nextAlpha;
    }
  };

  return {
    fillUniforms,
    fillUniformsRef,
    fillMatRef,
    primaryFootprintMatRef,
    updateFillAlpha,
  };
}
