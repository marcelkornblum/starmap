import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  auditSourceFile,
  auditFile,
  runR3fAudit,
  runR3FAudit,
  R3F_FILES_GLOB,
} from './audit-r3f';

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

  describe('Pure Function Exports auditFile, runR3fAudit, and CLI Runner runR3FAudit', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
      vi.restoreAllMocks();
      while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('auditFile returns structured diagnostics array', () => {
      const diags = auditFile('test.tsx', 'export const X = 1;');
      expect(Array.isArray(diags)).toBe(true);
      expect(diags).toEqual([]);
    });

    it('runR3fAudit accepts target dir and returns structured diagnostics', () => {
      const diags = runR3fAudit(['src/components/canvas']);
      expect(Array.isArray(diags)).toBe(true);
    });

    it('runR3FAudit returns exit code 0 when clean and 1 when errors are present', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3f-cli-test-'));
      tempDirs.push(tempDir);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(runR3FAudit([tempDir])).toBe(0);

      fs.writeFileSync(
        path.join(tempDir, 'Bad.tsx'),
        "import { useFrame } from '@react-three/fiber';\nexport const Bad = () => { useFrame(() => { const a = []; }); return null; };\n"
      );
      expect(runR3FAudit([tempDir])).toBe(1);
    });
  });

  describe('P-10: require-noop-raycast Rule', () => {
    it('flags new Line2(...) in src/components/canvas/ when .raycast = NOOP_RAYCAST is not assigned', () => {
      const code = `
        import { useMemo } from 'react';
        import { Line2 } from 'three/examples/jsm/lines/Line2.js';
        export const BadLine = ({ geom, mat }: any) => {
          const mesh = useMemo(() => {
            const m = new Line2(geom, mat);
            return m;
          }, [geom, mat]);
          return <primitive object={mesh} />;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/entity/BadLine.tsx', code);
      const rayDiags = diags.filter((d) => d.ruleId === 'require-noop-raycast');
      expect(rayDiags.length).toBe(1);
      expect(rayDiags[0].message).toContain('Line2');
    });

    it('permits new Line2(...) when .raycast = NOOP_RAYCAST is assigned or suppressed with reason', () => {
      const code = `
        import { useMemo } from 'react';
        import { Line2 } from 'three/examples/jsm/lines/Line2.js';
        import { NOOP_RAYCAST } from '../engineConfig';
        export const GoodLine = ({ geom, mat }: any) => {
          const mesh = useMemo(() => {
            const m = new Line2(geom, mat);
            m.raycast = NOOP_RAYCAST;
            return m;
          }, [geom, mat]);
          const interactiveMesh = useMemo(() => {
            // r3f-audit-disable-next-line require-noop-raycast -- Line is directly clickable
            return new Line2(geom, mat);
          }, [geom, mat]);
          return <group><primitive object={mesh} /><primitive object={interactiveMesh} /></group>;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/entity/GoodLine.tsx', code);
      expect(diags.filter((d) => d.ruleId === 'require-noop-raycast')).toEqual([]);
    });

    it('flags decorative <mesh> and <lineSegments> without pointer handlers or raycast={NOOP_RAYCAST}', () => {
      const code = `
        import '@react-three/fiber';
        export const BadMeshes = () => (
          <group>
            <mesh name="deco-sphere">
              <sphereGeometry args={[1, 16, 16]} />
            </mesh>
            <lineSegments name="deco-lines" />
          </group>
        );
      `;
      const diags = auditSourceFile('src/components/canvas/entity/BadMeshes.tsx', code);
      const rayDiags = diags.filter((d) => d.ruleId === 'require-noop-raycast');
      expect(rayDiags.length).toBe(2);
    });

    it('permits <mesh> and <lineSegments> with raycast={NOOP_RAYCAST}, pointer handlers, or in story files', () => {
      const code = `
        import '@react-three/fiber';
        import { NOOP_RAYCAST } from '../engineConfig';
        export const GoodMeshes = ({ onClick, onPointerOver }: any) => (
          <group>
            <mesh name="deco-sphere" raycast={NOOP_RAYCAST} />
            <lineSegments name="deco-lines" raycast={NOOP_RAYCAST} />
            <mesh name="hitarea" onClick={onClick} />
            <mesh name="hoverarea" onPointerOver={onPointerOver} />
          </group>
        );
      `;
      expect(
        auditSourceFile('src/components/canvas/entity/GoodMeshes.tsx', code).filter(
          (d) => d.ruleId === 'require-noop-raycast',
        ),
      ).toEqual([]);

      const storyCode = `
        import '@react-three/fiber';
        export const Demo = () => <mesh name="story-demo" />;
      `;
      expect(
        auditSourceFile('src/components/canvas/instrument/Demo.stories.tsx', storyCode).filter(
          (d) => d.ruleId === 'require-noop-raycast',
        ),
      ).toEqual([]);
    });
  });

  describe('require-demand-frameloop Rule', () => {
    it('flags <Canvas> without frameloop or with frameloop="always" in production files', () => {
      const missingCode = `
        import { Canvas } from '@react-three/fiber';
        export const Scene = () => (
          <Canvas camera={{ position: [0, 0, 10] }}>
            <mesh />
          </Canvas>
        );
      `;
      const missingDiags = auditSourceFile('src/views/GalaxyView.tsx', missingCode).filter(
        (d) => d.ruleId === 'require-demand-frameloop',
      );
      expect(missingDiags).toHaveLength(1);
      expect(missingDiags[0].message).toContain('frameloop');

      const alwaysCode = `
        import { Canvas } from '@react-three/fiber';
        export const MiniScene = () => (
          <>
            <Canvas frameloop="always" />
            <Canvas frameloop={'always'} />
            <Canvas frameloop={\`always\`} />
          </>
        );
      `;
      const alwaysDiags = auditSourceFile('src/components/domain/MiniMap.tsx', alwaysCode).filter(
        (d) => d.ruleId === 'require-demand-frameloop',
      );
      expect(alwaysDiags).toHaveLength(3);
    });

    it('permits frameloop="demand", frameloop="never", dynamic props, stories/tests, and reasoned suppressions', () => {
      const validCode = `
        import { Canvas } from '@react-three/fiber';
        export const ValidScenes = ({ frameloop }: { frameloop: 'demand' | 'always' }) => (
          <>
            <Canvas frameloop="demand" />
            <Canvas frameloop="never" />
            <Canvas frameloop={frameloop} />
            {/* r3f-audit-disable-next-line require-demand-frameloop -- Continuous calibration test */}
            <Canvas frameloop="always" />
          </>
        );
      `;
      expect(
        auditSourceFile('src/views/SystemView.tsx', validCode).filter(
          (d) => d.ruleId === 'require-demand-frameloop',
        ),
      ).toEqual([]);

      const storyCode = `
        import { Canvas } from '@react-three/fiber';
        export const StoryCanvas = () => <Canvas />;
      `;
      expect(
        auditSourceFile('src/components/domain/Scene.stories.tsx', storyCode).filter(
          (d) => d.ruleId === 'require-demand-frameloop',
        ),
      ).toEqual([]);
    });
  });

  describe('require-resource-dispose Rule', () => {
    it('flags GPU resource allocations in useMemo without a .dispose() call in src/components/canvas/ production files', () => {
      const leakyCode = `
        import { useMemo } from 'react';
        import * as THREE from 'three';
        export const LeakyCanvasItem = () => {
          const geo = useMemo(() => new THREE.BufferGeometry(), []);
          const mat = useMemo(() => new THREE.MeshBasicMaterial(), []);
          const dataTex = useMemo(() => new THREE.DataTexture(new Uint8Array(4), 1, 1), []);
          const canvasTex = useMemo(() => new THREE.CanvasTexture(document.createElement('canvas')), []);
          const rt = useMemo(() => new THREE.WebGLRenderTarget(64, 64), []);
          return <mesh geometry={geo} material={mat} />;
        };
      `;
      const diags = auditSourceFile('src/components/canvas/entity/Leaky.tsx', leakyCode).filter(
        (d) => d.ruleId === 'require-resource-dispose',
      );
      expect(diags).toHaveLength(5);
    });

    it('permits useMemo GPU resource allocations when .dispose() or cleanup is present, or outside canvas production files', () => {
      const cleanCode = `
        import { useEffect, useMemo } from 'react';
        import * as THREE from 'three';
        export const CleanCanvasItem = () => {
          const geo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
          const mat = useMemo(() => new THREE.MeshStandardMaterial(), []);
          useEffect(() => {
            return () => {
              geo.dispose();
              mat?.dispose();
            };
          }, [geo, mat]);
          return <mesh geometry={geo} material={mat} />;
        };
      `;
      expect(
        auditSourceFile('src/components/canvas/entity/Clean.tsx', cleanCode).filter(
          (d) => d.ruleId === 'require-resource-dispose',
        ),
      ).toEqual([]);

      const storyCode = `
        import { useMemo } from 'react';
        import * as THREE from 'three';
        export const StoryMesh = () => {
          const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
          return <mesh geometry={geo} />;
        };
      `;
      expect(
        auditSourceFile('src/components/canvas/entity/Demo.stories.tsx', storyCode).filter(
          (d) => d.ruleId === 'require-resource-dispose',
        ),
      ).toEqual([]);
    });

    it('respects reasoned suppression for require-resource-dispose', () => {
      const suppressedCode = `
        import { useMemo } from 'react';
        import * as THREE from 'three';
        export const SharedGeoItem = () => {
          // r3f-audit-disable-next-line require-resource-dispose -- Managed by shared registry cache
          const geo = useMemo(() => new THREE.BufferGeometry(), []);
          return <mesh geometry={geo} />;
        };
      `;
      expect(
        auditSourceFile('src/components/canvas/entity/Shared.tsx', suppressedCode).filter(
          (d) => d.ruleId === 'require-resource-dispose',
        ),
      ).toEqual([]);
    });
  });

  describe('Scope Expansion: src/components/domain and src/hooks', () => {
    it('includes src/components/domain, src/hooks, and src/router in R3F_FILES_GLOB', () => {
      expect(R3F_FILES_GLOB).toContain('src/components/canvas');
      expect(R3F_FILES_GLOB).toContain('src/components/domain');
      expect(R3F_FILES_GLOB).toContain('src/hooks');
      expect(R3F_FILES_GLOB).toContain('src/views');
      expect(R3F_FILES_GLOB).toContain('src/router');
    });

    it('flags atomic-store-selectors in src/components/domain and src/hooks', () => {
      const domainCode = `
        import { useCameraStore } from '../../stores/useCameraStore';
        export const DomainPanel = () => {
          const store = useCameraStore();
          return null;
        };
      `;
      expect(
        auditSourceFile('src/components/domain/Panel.tsx', domainCode).filter(
          (d) => d.ruleId === 'atomic-store-selectors',
        ),
      ).toHaveLength(1);

      const hookCode = `
        import { useUIStore } from '../stores/useUIStore';
        export const useMyHook = () => {
          return useUIStore((s) => s);
        };
      `;
      expect(
        auditSourceFile('src/hooks/useMyHook.ts', hookCode).filter(
          (d) => d.ruleId === 'atomic-store-selectors',
        ),
      ).toHaveLength(1);
    });
  });

  describe('single-canvas-host Rule', () => {
    const canvasCode = `
      import { Canvas } from '@react-three/fiber';
      export const Host = () => (
        <Canvas frameloop="demand">
          <mesh />
        </Canvas>
      );
    `;

    it('permits <Canvas> in the 3 sanctioned host files', () => {
      const sanctionedHosts = [
        'src/components/domain/CanvasLayer/CanvasWebGLHost.tsx',
        'src/components/canvas/scenes/StandaloneSceneShell.tsx',
        'src/components/canvas/scenes/InteractiveNavigator.tsx',
        '/repo/starmap/src/components/domain/CanvasLayer/CanvasWebGLHost.tsx',
      ];
      for (const hostPath of sanctionedHosts) {
        expect(
          auditSourceFile(hostPath, canvasCode).filter((d) => d.ruleId === 'single-canvas-host'),
        ).toEqual([]);
      }
    });

    it('flags <Canvas> in unsanctioned view, domain, or router production files', () => {
      const unsanctionedPaths = [
        'src/views/GalaxyView.tsx',
        'src/components/domain/MiniMap/MiniMap.tsx',
        'src/router/AppLayout.tsx',
      ];
      for (const filePath of unsanctionedPaths) {
        const diags = auditSourceFile(filePath, canvasCode).filter(
          (d) => d.ruleId === 'single-canvas-host',
        );
        expect(diags).toHaveLength(1);
        expect(diags[0].severity).toBe('error');
        expect(diags[0].message).toContain('Canvas');
      }
    });

    it('exempts stories and test files from single-canvas-host and allows reasoned suppressions', () => {
      expect(
        auditSourceFile('src/components/domain/MiniMap/MiniMap.stories.tsx', canvasCode).filter(
          (d) => d.ruleId === 'single-canvas-host',
        ),
      ).toEqual([]);
      expect(
        auditSourceFile('src/views/GalaxyView.test.tsx', canvasCode).filter(
          (d) => d.ruleId === 'single-canvas-host',
        ),
      ).toEqual([]);

      const suppressedCode = `
        import { Canvas } from '@react-three/fiber';
        export const SpecialHost = () => (
          // r3f-audit-disable-next-line single-canvas-host -- Isolated WebGL calibration harness
          <Canvas frameloop="demand" />
        );
      `;
      expect(
        auditSourceFile('src/views/CalibrationView.tsx', suppressedCode).filter(
          (d) => d.ruleId === 'single-canvas-host',
        ),
      ).toEqual([]);
    });

    it('scans files containing <Canvas> in runR3fAudit even without useFrame or three imports', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3f-canvas-host-'));
      try {
        const routerDir = path.join(tempDir, 'src', 'router');
        fs.mkdirSync(routerDir, { recursive: true });
        const routerFile = path.join(routerDir, 'RouteCanvas.tsx');
        fs.writeFileSync(
          routerFile,
          'export const RouteCanvas = () => <Canvas frameloop="demand" />;\n',
        );
        const diags = runR3fAudit([routerDir]);
        expect(diags.some((d) => d.ruleId === 'single-canvas-host')).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
