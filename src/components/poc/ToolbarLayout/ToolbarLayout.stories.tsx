import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToolbarLayout } from './ToolbarLayout';
import { Button, Input } from '../../interface/controls';
import { Cluster } from '../../interface/layouts';

const meta: Meta<typeof ToolbarLayout> = {
  title: 'POC/Templates/ToolbarLayout',
  component: ToolbarLayout,
};

export default meta;
type Story = StoryObj<typeof ToolbarLayout>;

export const Default: Story = {
  args: {
    start: (
      <Cluster gap="tight">
        <Button variant="primary" size="sm">Galaxy</Button>
        <Button variant="default" size="sm">System</Button>
        <Button variant="subtle" size="sm">Catalog</Button>
      </Cluster>
    ),
    center: <strong>Starmap HUD Nav</strong>,
    end: (
      <Cluster gap="tight">
        <Input placeholder="Search celestial bodies..." sizeVariant="sm" />
        <Button variant="default" size="sm">Settings</Button>
      </Cluster>
    ),
  },
};
