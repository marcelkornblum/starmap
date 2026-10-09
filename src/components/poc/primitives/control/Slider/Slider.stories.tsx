import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Slider } from './Slider';
import { Center } from '../../layout/Center/Center';
import { Stack } from '../../layout/Stack/Stack';

const meta: Meta<typeof Slider> = {
  title: 'POC/Primitives/Control/Slider',
  component: Slider,
};

export default meta;
type Story = StoryObj<typeof Slider>;

const SliderDemo = () => {
  const [val, setVal] = useState(15);
  return (
    <Center max="sm">
      <Slider
        value={val}
        min={0}
        max={30}
        step={1}
        onChange={setVal}
        label="Apparent Magnitude Cutoff"
      />
    </Center>
  );
};

const MultiSliderDemo = () => {
  const [mag, setMag] = useState(12.5);
  const [parallax, setParallax] = useState(45);
  const [fov, setFov] = useState(60);

  return (
    <Center max="sm">
      <Stack gap="loose">
        <Slider
          value={mag}
          min={0}
          max={25}
          step={0.5}
          onChange={setMag}
          label="Magnitude Cutoff (V_mag)"
        />
        <Slider
          value={parallax}
          min={10}
          max={100}
          step={1}
          onChange={setParallax}
          label="Parallax Precision Filter (mas)"
        />
        <Slider
          value={fov}
          min={15}
          max={120}
          step={5}
          onChange={setFov}
          label="Field of View (deg)"
        />
      </Stack>
    </Center>
  );
};

export const Default: Story = {
  render: () => <SliderDemo />,
};

export const MultipleSliders: Story = {
  render: () => <MultiSliderDemo />,
};

export const Disabled: Story = {
  render: () => (
    <Center max="sm">
      <Slider
        value={20}
        min={0}
        max={50}
        disabled
        onChange={() => {}}
        label="Fixed Calibration Sensor"
      />
    </Center>
  ),
};
