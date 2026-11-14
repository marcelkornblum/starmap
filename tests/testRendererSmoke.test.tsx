import ReactThreeTest from '@react-three/test-renderer';
import { describe, it, expect } from 'vitest';

describe('@react-three/test-renderer compatibility (DEC-R057)', () => {
  it('mounts a trivial mesh cleanly under unit:dom', async () => {
    const renderer = await ReactThreeTest.create(
      <mesh>
        <boxGeometry />
        <meshBasicMaterial />
      </mesh>,
    );
    expect(renderer.scene.children).toHaveLength(1);
    expect(renderer.scene.children[0].type).toBe('Mesh');
  });
});
