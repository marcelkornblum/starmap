import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpatialShell } from './SpatialShell';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { ControlBar } from '../ControlBar/ControlBar';
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

const MockDetailsPanel = () => (
  <Card padding="default">
    <Stack gap="tight">
      <Heading as="h3" size="lead">
        Tau Ceti
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
        Route: Sol → Tau Ceti
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
        <span>Tau Ceti e (Habitable)</span>
        <span>Tau Ceti f (Cold Desert)</span>
        <span>Tau Ceti g (Terrestrial)</span>
        <span>Tau Ceti h (Ice Giant)</span>
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
    controls: <ControlBar scope="galaxy" />,
    bodies: <MockBodiesList />,
  },
};

export const WithBodiesDrawerOpen: Story = {
  args: {
    canvas: <CanvasLayer scope="system" targetId="tau-ceti" />,
    breadcrumbs: <Breadcrumbs items={[{ label: 'Galaxy' }, { label: 'Tau Ceti' }]} />,
    detailsPanel: <MockDetailsPanel />,
    controls: <ControlBar scope="system" />,
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
    controls: <ControlBar scope="galaxy" />,
    bodies: <MockBodiesList />,
  },
};
