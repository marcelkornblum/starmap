import { describe, it, expect } from 'vitest';
import {
  auditSourceFile,
  auditFile,
  runR3fAudit,
} from '../../../scripts/audit-r3f';

describe('WebGL & R3F Performance Audit (scripts/audit-r3f.ts)', () => {
  describe('AUD-003: useFrame Layout Reads Detection', () => {
    it('flags property-access layout reads: offsetWidth, offsetHeight, clientWidth, clientHeight, scrollWidth, scrollHeight', () => {
      const code = `
        import { useFrame } from '@react-three/fiber';
        export const BadComponent = ({ labelRef }: any) => {
          useFrame(() => {
            const w = labelRef.current.offsetWidth;
            const h = labelRef.current.offsetHeight;
            const cw = labelRef.current.clientWidth;
            const ch = labelRef.current.clientHeight;
            const sw = labelRef.current.scrollWidth;
            const sh = labelRef.current.scrollHeight;
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Bad.tsx', code);
      const layoutDiags = diags.filter((d) => d.ruleId === 'no-layout-in-use-frame');
      expect(layoutDiags.length).toBe(6);
      expect(layoutDiags.some((d) => d.snippet.includes('offsetWidth'))).toBe(true);
      expect(layoutDiags.some((d) => d.snippet.includes('clientHeight'))).toBe(true);
    });

    it('flags method-call layout reads: getBoundingClientRect and getComputedStyle', () => {
      const code = `
        import { useFrame } from '@react-three/fiber';
        export const BadCalls = ({ elRef }: any) => {
          useFrame(() => {
            const rect = elRef.current.getBoundingClientRect();
            const style = getComputedStyle(elRef.current);
            const winStyle = window.getComputedStyle(elRef.current);
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/BadCalls.tsx', code);
      const layoutDiags = diags.filter((d) => d.ruleId === 'no-layout-in-use-frame');
      expect(layoutDiags.length).toBe(3);
    });

    it('respects r3f-audit-disable-next-line suppression comment', () => {
      const code = `
        import { useFrame } from '@react-three/fiber';
        export const Suppressed = ({ labelRef }: any) => {
          useFrame(() => {
            // r3f-audit-disable-next-line no-layout-in-use-frame
            const w = labelRef.current.offsetWidth;
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Suppressed.tsx', code);
      expect(diags.filter((d) => d.ruleId === 'no-layout-in-use-frame')).toEqual([]);
    });
  });

  describe('AUD-003: useFrame Allocations & React Setters', () => {
    it('flags new THREE.Vector3() or new object allocations in useFrame', () => {
      const code = `
        import { useFrame } from '@react-three/fiber';
        import * as THREE from 'three';
        export const AllocComponent = () => {
          useFrame(() => {
            const v = new THREE.Vector3(1, 2, 3);
            const obj = { x: 10 };
            const arr = [1, 2, 3];
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Alloc.tsx', code);
      const allocDiags = diags.filter((d) => d.ruleId === 'no-alloc-in-use-frame');
      expect(allocDiags.length).toBe(3);
      expect(allocDiags.some((d) => d.snippet.includes('Vector3'))).toBe(true);
    });

    it('flags .clone() calls inside useFrame', () => {
      const code = `
        import { useFrame } from '@react-three/fiber';
        export const CloneComponent = ({ target }: any) => {
          useFrame(() => {
            const copy = target.clone();
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Clone.tsx', code);
      const cloneDiags = diags.filter((d) => d.ruleId === 'no-alloc-in-use-frame');
      expect(cloneDiags.length).toBe(1);
      expect(cloneDiags[0].snippet).toContain('.clone()');
    });

    it('flags React state setters in useFrame', () => {
      const code = `
        import { useState } from 'react';
        import { useFrame } from '@react-three/fiber';
        export const SetterComponent = () => {
          const [val, setVal] = useState(0);
          useFrame(() => {
            setVal(1);
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Setter.tsx', code);
      const setterDiags = diags.filter((d) => d.ruleId === 'no-setstate-in-use-frame');
      expect(setterDiags.length).toBe(1);
      expect(setterDiags[0].snippet).toContain('setVal(1)');
    });

    it('allows clean in-place mutations using pre-allocated scratch objects', () => {
      const code = `
        import { useRef } from 'react';
        import { useFrame } from '@react-three/fiber';
        import * as THREE from 'three';

        const scratch = new THREE.Vector3();

        export const CleanComponent = () => {
          useFrame((state, delta) => {
            scratch.set(1, 2, 3);
            scratch.addScalar(delta);
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Clean.tsx', code);
      expect(diags).toEqual([]);
    });
  });

  describe('Pure Function Exports auditFile and runR3fAudit', () => {
    it('auditFile returns structured diagnostics array', () => {
      const diags = auditFile('test.tsx', 'export const X = 1;');
      expect(Array.isArray(diags)).toBe(true);
      expect(diags).toEqual([]);
    });

    it('runR3fAudit accepts target dir and returns structured diagnostics', () => {
      const diags = runR3fAudit(['src/components/canvas']);
      expect(Array.isArray(diags)).toBe(true);
    });
  });
});
