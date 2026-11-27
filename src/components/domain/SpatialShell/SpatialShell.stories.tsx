import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import { SpatialShell } from './SpatialShell';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { Button, Card, Heading, Stack } from '../../interface';
import { CanvasLayer } from '../CanvasLayer/CanvasLayer';

const meta: Meta<typeof SpatialShell> = {
  title: 'Domain/SpatialShell',
  component: SpatialShell,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SpatialShell>;

const MOCK_ORIENTATION: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'origin',
  anchorName: 'Origin',
  systemId: 'origin',
  systemName: 'Origin',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
  cameraAzimuthDeg: 45,
  cameraElevationDeg: 30,
  cameraDistance: 42,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const MockDetailsPanel = () => (
  <Card padding="default">
    <Stack gap="tight">
      <Heading as="h3" size="lead">
        G-Type Star System
      </Heading>
      <span>G8.5V Main Sequence Star · 11.9 ly</span>
      <span>4 Confirmed Exoplanets (3 Terrestrial, 1 Ice Giant)</span>
    </Stack>
  </Card>
);

const MockDirectionsPanel = () => (
  <Card padding="default">
    <Stack gap="tight">
      <Heading as="h3" size="lead">
        Interstellar Transit Plan
      </Heading>
      <span>Distance: 3.65 pc (11.90 ly) · 1 Leg</span>
      <span>Subspace Transit Estimated: 4.2 weeks</span>
    </Stack>
  </Card>
);

const MockBodiesList = () => (
  <Card padding="default">
    <Stack gap="tight">
      <Heading as="h3" size="lead">
        System Bodies
      </Heading>
      <Stack gap="tight">
        <span>Planet e (Habitable)</span>
        <span>Planet f (Cold Desert)</span>
        <span>Planet g (Terrestrial)</span>
        <span>Planet h (Ice Giant)</span>
      </Stack>
    </Stack>
  </Card>
);

export const Default: Story = {
  args: {
    canvas: <CanvasLayer scope="galaxy" centerId="sol" />,
    breadcrumbs: <Breadcrumbs items={[{ label: 'Galaxy' }]} />,
    search: (
      <Button size="sm" variant="subtle">
        Search Universe (/)
      </Button>
    ),
    detailsPanel: <MockDetailsPanel />,
    minimapOrientation: MOCK_ORIENTATION,
    bodies: <MockBodiesList />,
  },
};

export const WithBodiesDrawerOpen: Story = {
  args: {
    canvas: <CanvasLayer scope="system" targetId="tau-ceti" />,
    breadcrumbs: <Breadcrumbs items={[{ label: 'Galaxy' }, { label: 'System' }]} />,
    detailsPanel: <MockDetailsPanel />,
    minimapOrientation: { ...MOCK_ORIENTATION, scope: 'system', cameraDistance: 18 },
    bodies: <MockBodiesList />,
    initialBodiesDrawerOpen: true,
  },
};

export const DualPanelsSimultaneous: Story = {
  args: {
    canvas: <CanvasLayer scope="galaxy" centerId="sol" />,
    breadcrumbs: <Breadcrumbs items={[{ label: 'Galaxy' }, { label: 'Route Plan' }]} />,
    detailsPanel: <MockDetailsPanel />,
    directionsPanel: <MockDirectionsPanel />,
    minimapOrientation: MOCK_ORIENTATION,
    bodies: <MockBodiesList />,
  },
};

export const DocumentMode: Story = {
  args: {
    mode: 'document',
    activeWorkspace: 'guide',
    companionMapHref: '/galaxy',
    children: (
      <Card padding="loose">
        <Stack gap="default">
          <Heading as="h1">Reference Guide</Heading>
          <p>Scrollable document workspace hosted inside SpatialShell with ConsoleDock navigation.</p>
        </Stack>
      </Card>
    ),
  },
};
