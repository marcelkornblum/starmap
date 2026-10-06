import type { Meta, StoryObj } from '@storybook/react-vite';
import { Well } from './Well';

const meta: Meta<typeof Well> = {
  title: 'POC/Surfaces/Well',
  component: Well,
};

export default meta;
type Story = StoryObj<typeof Well>;

export const Default: Story = {
  args: {
    padding: 'default',
    tabular: true,
    children: (
      <div>
        <code>RA: 19h 50m 47.0s | Dec: +08° 52′ 06″</code>
        <br />
        <code>Parallax: 194.95 ± 0.05 mas | Distance: 5.13 pc</code>
      </div>
    ),
  },
};
