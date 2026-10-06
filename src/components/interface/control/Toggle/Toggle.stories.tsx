import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from './Toggle';
import { Stack } from '../../layout/Stack/Stack';
import { Cluster } from '../../layout/Cluster/Cluster';

const meta: Meta<typeof Toggle> = {
  title: 'INTERFACE/Control',
  component: Toggle,
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const ToggleStory: Story = {
  name: 'Toggle',
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Toggle</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          Binary switch for instantaneous state changes. Visually distinct from checkboxes, used when changes apply immediately rather than on form submission.
        </p>
      </div>
      <Stack gap="loose">
        <Cluster gap="loose">
          <Toggle {...args} checked={true} onChange={() => {}} label="Telemetry" />
          <Toggle {...args} checked={false} onChange={() => {}} label="Shields" />
        </Cluster>
        <Cluster gap="loose">
          <Toggle {...args} disabled checked={true} onChange={() => {}} label="Telemetry (Disabled)" />
          <Toggle {...args} disabled checked={false} onChange={() => {}} label="Shields (Disabled)" />
        </Cluster>
      </Stack>
    </div>
  ),
};
