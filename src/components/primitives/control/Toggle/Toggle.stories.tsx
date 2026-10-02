import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Primitives/Control/Toggle',
  component: Toggle,
};

export default meta;
type Story = StoryObj<typeof Toggle>;

const ToggleDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Toggle
      checked={checked}
      onChange={setChecked}
      label="Project Orbital Paths"
    />
  );
};

export const Default: Story = {
  render: () => <ToggleDemo />,
};
