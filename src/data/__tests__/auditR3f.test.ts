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

    it('respects r3f-audit-disable-next-line suppression comment with required reason', () => {
      const code = `
        import { useFrame } from '@react-three/fiber';
        export const Suppressed = ({ labelRef }: any) => {
          useFrame(() => {
            // r3f-audit-disable-next-line no-layout-in-use-frame -- Measurement is throttled and cached
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

  describe('AUD-003: Atomic Store Selectors & Zustand Subscriptions', () => {
    it('flags 0-argument whole-store subscription hooks: useAppStore()', () => {
      const code = `
        import { useAppStore } from '../stores/useAppStore';
        export const WholeStoreComponent = () => {
          const store = useAppStore();
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Whole.tsx', code);
      const storeDiags = diags.filter((d) => d.ruleId === 'atomic-store-selectors');
      expect(storeDiags.length).toBe(1);
      expect(storeDiags[0].message).toContain('Whole-store subscription');
    });

    it('flags identity store selectors: useAppStore((state) => state) and useAppStore(s => s)', () => {
      const code = `
        import { useAppStore } from '../stores/useAppStore';
        export const IdentityComponent = () => {
          const s1 = useAppStore((state) => state);
          const s2 = useAppStore((s) => s);
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Identity.tsx', code);
      const storeDiags = diags.filter((d) => d.ruleId === 'atomic-store-selectors');
      expect(storeDiags.length).toBe(2);
      expect(storeDiags[0].message).toContain('Identity store selector');
    });

    it('flags object-literal-returning store selectors: useAppStore(s => ({ a: s.a }))', () => {
      const code = `
        import { useAppStore } from '../stores/useAppStore';
        export const ObjectSelectorComponent = () => {
          const { a } = useAppStore((s) => ({ a: s.a }));
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Obj.tsx', code);
      const storeDiags = diags.filter((d) => d.ruleId === 'atomic-store-selectors');
      expect(storeDiags.length).toBe(1);
      expect(storeDiags[0].message).toContain('Object-literal returning store selector');
    });

    it('flags broad state.tokens subscription on useThemeStore', () => {
      const code = `
        import { useThemeStore } from '../stores/useThemeStore';
        export const ThemeComponent = () => {
          const tokens = useThemeStore((state) => state.tokens);
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/Theme.tsx', code);
      const storeDiags = diags.filter((d) => d.ruleId === 'atomic-store-selectors');
      expect(storeDiags.length).toBe(1);
      expect(storeDiags[0].message).toContain('state.tokens');
    });

    it('permits discrete atomic store selectors', () => {
      const code = `
        import { useAppStore } from '../stores/useAppStore';
        import { useThemeStore } from '../stores/useThemeStore';
        export const CleanStoreComponent = () => {
          const zoom = useAppStore((s) => s.zoom);
          const bg = useThemeStore((s) => s.tokens.canvasBg);
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/CleanStore.tsx', code);
      expect(diags.filter((d) => d.ruleId === 'atomic-store-selectors')).toEqual([]);
    });
  });

  describe('AUD-003: Inline JSX Geometry Detection', () => {
    it('flags new THREE.SphereGeometry and new BufferGeometry inside JSX props', () => {
      const code = `
        import * as THREE from 'three';
        import { BufferGeometry } from 'three';
        export const MeshComponent = () => (
          <group>
            <mesh geometry={new THREE.SphereGeometry(1, 16, 16)} />
            <primitive object={new BufferGeometry()} />
          </group>
        );
      `;
      const diags = auditSourceFile('src/components/canvas/InlineGeo.tsx', code);
      const geoDiags = diags.filter((d) => d.ruleId === 'no-inline-jsx-geometry');
      expect(geoDiags.length).toBe(2);
      expect(geoDiags.some((d) => d.snippet.includes('SphereGeometry'))).toBe(true);
      expect(geoDiags.some((d) => d.snippet.includes('BufferGeometry'))).toBe(true);
    });

    it('permits geometry created in useMemo or module scope', () => {
      const code = `
        import { useMemo } from 'react';
        import * as THREE from 'three';
        const staticGeo = new THREE.BoxGeometry(1, 1, 1);
        export const CleanMeshComponent = () => {
          const memoGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
          return (
            <mesh geometry={memoGeo} />
          );
        };
      `;
      const diags = auditSourceFile('src/components/canvas/CleanGeo.tsx', code);
      expect(diags.filter((d) => d.ruleId === 'no-inline-jsx-geometry')).toEqual([]);
    });
  });

  describe('AUD-003: Material Recreation Dependency Checks (no-material-memo-color-deps)', () => {
    it('flags useMemo recreating materials on color or opacity dependency changes', () => {
      const code = `
        import { useMemo } from 'react';
        import * as THREE from 'three';
        export const MaterialComponent = ({ color, opacity, emissiveColor }: any) => {
          const mat1 = useMemo(() => new THREE.MeshStandardMaterial({ color }), [color]);
          const mat2 = useMemo(() => new THREE.MeshBasicMaterial({ opacity }), [opacity]);
          const mat3 = useMemo(() => new THREE.ShaderMaterial({}), [emissiveColor]);
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/MatRecreate.tsx', code);
      const matDiags = diags.filter((d) => d.ruleId === 'no-material-memo-color-deps');
      expect(matDiags.length).toBe(3);
    });

    it('permits useMemo with static or non-color dependencies', () => {
      const code = `
        import { useMemo } from 'react';
        import * as THREE from 'three';
        export const CleanMaterialComponent = ({ wireframe }: { wireframe: boolean }) => {
          const mat = useMemo(() => new THREE.MeshBasicMaterial({ wireframe }), [wireframe]);
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/CleanMat.tsx', code);
      expect(diags.filter((d) => d.ruleId === 'no-material-memo-color-deps')).toEqual([]);
    });
  });

  describe('AUD-003: Suppression Reason Validation (invalid-suppression)', () => {
    it('flags unreasoned r3f-audit-disable comments without -- <reason>', () => {
      const code = `
        import { useFrame } from '@react-three/fiber';
        export const BadSuppression = ({ labelRef }: any) => {
          useFrame(() => {
            // r3f-audit-disable-next-line no-layout-in-use-frame
            const w = labelRef.current.offsetWidth;
          });
          return null;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/BadSupp.tsx', code);
      const invalidSupp = diags.filter((d) => d.ruleId === 'invalid-suppression');
      expect(invalidSupp.length).toBe(1);
      expect(invalidSupp[0].message).toContain('without a required reason');
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
