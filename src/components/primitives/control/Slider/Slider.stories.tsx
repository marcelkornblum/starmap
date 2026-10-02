import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Slider } from './Slider';
import { Center } from '../../layout/Center/Center';

const meta: Meta<typeof Slider> = {
  title: 'Primitives/Control/Slider',
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

export const Default: Story = {
  render: () => <SliderDemo />,
};
