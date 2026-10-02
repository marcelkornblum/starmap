import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cover } from './Cover';

const meta: Meta<typeof Cover> = {
  title: 'Primitives/Layout/Cover',
  component: Cover,
  argTypes: {
    minHeight: {
      control: 'radio',
      options: ['viewport', 'full'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Cover>;

export const Default: Story = {
  args: {
    minHeight: 'viewport',
    header: <header style={{ borderBottom: '1px solid var(--surface-panel-border-color)', padding: '8px' }}>Starmap Header</header>,
    children: (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <h2>Principal Mission Briefing</h2>
        <p>Centred vertically regardless of viewport dimension.</p>
      </div>
    ),
    footer: <footer style={{ borderTop: '1px solid var(--surface-panel-border-color)', padding: '8px' }}>Telemetry Footer</footer>,
  },
};
