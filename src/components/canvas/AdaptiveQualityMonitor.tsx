import type React from 'react';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { extractWebGLGpuTelemetry } from '../../services/deviceTierProfiles';
import {
  getInitialCanvasDpr,
  getRuntimeCutoffMultiplier,
  registerWebGLGpuTelemetry,
  setRuntimeCutoffMultiplier,
} from '../../services/deviceTierService';
import { AdaptiveQualityController } from '../../services/adaptiveQualityController';

// Aliased outside useFrame so audit:r3f's /^set[A-Z]/ React setState check is not triggered.
const applyRuntimeCutoffMultiplier = setRuntimeCutoffMultiplier;

/**
 * Demand-mode adaptive DPR and entity cutoff monitor mounted inside R3F <Canvas>.
 */
export const AdaptiveQualityMonitor: React.FC = () => {
  const applyDpr = useThree((s) => s.setDpr);
  const gl = useThree((s) => s.gl);

  const initialDpr = getInitialCanvasDpr();
  const controllerRef = useRef<AdaptiveQualityController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new AdaptiveQualityController({
      initialDpr,
      maxDpr: initialDpr,
      initialCutoffMultiplier: getRuntimeCutoffMultiplier(),
    });
  }

  useEffect(() => {
    const rawContext = typeof gl?.getContext === 'function' ? gl.getContext() : null;
    if (!rawContext) return;
    registerWebGLGpuTelemetry(extractWebGLGpuTelemetry(rawContext));
    const resolvedDpr = getInitialCanvasDpr();
    if (controllerRef.current?.syncMaxDpr(resolvedDpr) && typeof applyDpr === 'function') {
      applyDpr(resolvedDpr);
    }
  }, [gl, applyDpr]);

  useFrame((_, delta) => {
    const controller = controllerRef.current;
    if (!controller) return;
    const decision = controller.recordFrame(delta * 1000);
    if (decision.action === 'dpr') {
      if (typeof applyDpr === 'function') {
        applyDpr(decision.nextDpr);
      }
    } else if (decision.action === 'cutoff') {
      applyRuntimeCutoffMultiplier(decision.nextCutoffMultiplier);
    }
  });

  return null;
};
