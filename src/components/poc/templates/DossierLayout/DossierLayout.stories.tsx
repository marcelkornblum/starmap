import type { Meta, StoryObj } from '@storybook/react-vite';
import { DossierLayout } from './DossierLayout';
import { Metric, Datum, Badge, Button, Cluster } from '../../primitives';

const meta: Meta<typeof DossierLayout> = {
  title: 'POC/Templates/DossierLayout',
  component: DossierLayout,
};

export default meta;
type Story = StoryObj<typeof DossierLayout>;

export const Default: Story = {
  args: {
    header: (
      <Cluster justify="between" align="center">
        <div>
          <h2>Kepler-186 f</h2>
          <Badge status="nominal">Habitable Zone Candidate</Badge>
        </div>
        <Button variant="primary">Target System</Button>
      </Cluster>
    ),
    metrics: (
      <Cluster gap="default">
        <Metric label="Radius" value="1.17" unit="R⊕" />
        <Metric label="Semi-Major Axis" value="0.432" unit="AU" />
        <Metric label="Orbital Period" value="129.9" unit="days" />
      </Cluster>
    ),
    children: (
      <div>
        <Datum label="Stellar Host" value="Kepler-186" />
        <Datum label="Spectral Type" value="M1V" />
        <Datum label="Distance" value="582" unit="ly" />
        <Datum label="Discovery Method" value="Transit" />
      </div>
    ),
    actions: (
      <Cluster justify="end" gap="tight">
        <Button variant="subtle">Export FITS</Button>
        <Button variant="default">Plot Orbit</Button>
      </Cluster>
    ),
  },
};
