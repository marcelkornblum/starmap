import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { JourneyChord } from './JourneyChord';
import { NOOP_RAYCAST } from '../engineConfig';
import type { JourneyChordLeg } from '../cartography/journeyChordGeometry';

describe('JourneyChord Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLegs: JourneyChordLeg[] = [
    {
      id: 'leg-1',
      stepIndex: 1,
      fromId: 'sol',
      fromName: 'Sol',
      toId: 'alpha-centauri',
      toName: 'Alpha Centauri',
      fromPosition: [0, 0, 0],
      toPosition: [10, 20, 5],
      distanceLabel: '4.37 ly',
    },
  ];

  it('renders root group, line2 mesh, elevation segments, and waypoints', async () => {
    const renderer = await ReactThreeTest.create(
      <JourneyChord legs={mockLegs} showElevationProjection={true} />,
    );

    const root = renderer.scene.find((node) => node.props.name === 'journey-chord-root');
    expect(root).toBeDefined();

    const leg = renderer.scene.find((node) => node.props.name === 'journey-chord-leg');
    expect(leg).toBeDefined();

    const waypoints = renderer.scene.findAll((node) => node.props.name === 'journey-chord-waypoint');
    expect(waypoints.length).toBeGreaterThanOrEqual(1);

    await renderer.unmount();
  });

  it('attaches NOOP_RAYCAST to line2Mesh, elevation lineSegments, and waypoint meshes', async () => {
    const renderer = await ReactThreeTest.create(
      <JourneyChord legs={mockLegs} showElevationProjection={true} />,
    );

    const leg = renderer.scene.find((node) => node.props.name === 'journey-chord-leg');
    expect(leg).toBeDefined();
    const line2 = leg.children.find(
      (child) => Boolean(child.instance && 'isLine2' in child.instance) || child.type === 'Line2',
    );
    expect(line2).toBeDefined();
    expect(line2?.instance?.raycast).toBe(NOOP_RAYCAST);

    const elevationLines = renderer.scene.find((node) => node.type === 'LineSegments');
    expect(elevationLines).toBeDefined();
    expect(elevationLines.props.raycast).toBe(NOOP_RAYCAST);

    const waypoints = renderer.scene.findAll((node) => node.props.name === 'journey-chord-waypoint');
    expect(waypoints.length).toBeGreaterThanOrEqual(1);
    for (const wp of waypoints) {
      expect(wp.props.raycast).toBe(NOOP_RAYCAST);
    }

    await renderer.unmount();
  });

  it('returns null when legs are empty or visible=false', async () => {
    const emptyRenderer = await ReactThreeTest.create(
      <JourneyChord legs={[]} />,
    );
    expect(emptyRenderer.scene.findAll((node) => node.props.name === 'journey-chord-root')).toHaveLength(0);
    await emptyRenderer.unmount();

    const hiddenRenderer = await ReactThreeTest.create(
      <JourneyChord legs={mockLegs} visible={false} />,
    );
    expect(hiddenRenderer.scene.findAll((node) => node.props.name === 'journey-chord-root')).toHaveLength(0);
    await hiddenRenderer.unmount();
  });
});
