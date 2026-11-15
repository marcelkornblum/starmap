import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanarGridMaterials } from './usePlanarGridMaterials';

describe('usePlanarGridMaterials', () => {
  it('creates stable fill uniforms and updates values via ref without mutating memo directly', () => {
    const { result, rerender } = renderHook(
      (props) => usePlanarGridMaterials(props),
      {
        initialProps: {
          datumPlaneFillColor: '#ffffff',
          datumPlaneFillAlpha: 0.5,
          datumPlaneFillGradientInner: 0.2,
          datumPlaneFillGradientExponent: 2.0,
          stateFocus: '#00ffff',
        },
      },
    );

    expect(result.current.fillUniforms.uAlpha.value).toBe(0.5);
    expect(result.current.fillUniforms.uInnerRadius.value).toBe(0.2);
    expect(result.current.fillUniforms.uExponent.value).toBe(2.0);

    rerender({
      datumPlaneFillColor: '#ff0000',
      datumPlaneFillAlpha: 0.8,
      datumPlaneFillGradientInner: 0.4,
      datumPlaneFillGradientExponent: 4.0,
      stateFocus: '#ffff00',
    });

    expect(result.current.fillUniforms.uAlpha.value).toBe(0.8);
    expect(result.current.fillUniforms.uInnerRadius.value).toBe(0.4);
    expect(result.current.fillUniforms.uExponent.value).toBe(4.0);

    act(() => {
      result.current.updateFillAlpha(0.5);
    });
    expect(result.current.fillUniforms.uAlpha.value).toBeCloseTo(0.4);
  });
});
