import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Toggle } from './Toggle';
import { Stack } from '../../../../interface/layout/Stack/Stack';

const meta: Meta<typeof Toggle> = {
  title: 'POC/Primitives/Control/Toggle',
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

const ToggleListDemo = () => {
  const [orbits, setOrbits] = useState(true);
  const [constellations, setConstellations] = useState(false);
  const [grid, setGrid] = useState(true);
  const [reticle, setReticle] = useState(false);

  return (
    <Stack gap="default">
      <Toggle
        checked={orbits}
        onChange={setOrbits}
        label="Project Orbital Paths"
      />
      <Toggle
        checked={constellations}
        onChange={setConstellations}
        label="Render Constellation Boundaries"
      />
      <Toggle
        checked={grid}
        onChange={setGrid}
        label="Equatorial Coordinate Grid"
      />
      <Toggle
        checked={reticle}
        onChange={setReticle}
        label="Instrument Targeting Reticle"
      />
      <Toggle
        checked={true}
        disabled
        onChange={() => {}}
        label="Galactic Plane Invariant (Locked)"
      />
    </Stack>
  );
};

export const Default: Story = {
  render: () => <ToggleDemo />,
};

export const Checked: Story = {
  args: {
    checked: true,
    label: 'Orbital Kinematics Active',
    onChange: () => {},
  },
};

export const Unchecked: Story = {
  args: {
    checked: false,
    label: 'Orbital Kinematics Inactive',
    onChange: () => {},
  },
};

export const Disabled: Story = {
  render: () => (
    <Stack gap="tight">
      <Toggle
        checked={true}
        disabled
        onChange={() => {}}
        label="Core Telemetry Sync (Locked ON)"
      />
      <Toggle
        checked={false}
        disabled
        onChange={() => {}}
        label="Auxiliary Sensor Array (Offline)"
      />
    </Stack>
  ),
};

export const TelemetryGroup: Story = {
  render: () => <ToggleListDemo />,
};
