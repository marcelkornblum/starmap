import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Primitives/Control/Select',
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

const SelectDemo = () => {
  const [val, setVal] = useState('icrs');
  return (
    <div style={{ maxWidth: '240px' }}>
      <Select
        value={val}
        onChange={setVal}
        options={[
          { value: 'icrs', label: 'ICRS Equatorial' },
          { value: 'galactic', label: 'Galactic Coordinates' },
          { value: 'ecliptic', label: 'Heliocentric Ecliptic' },
        ]}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <SelectDemo />,
};
