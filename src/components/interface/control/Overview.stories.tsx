import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from './Button/Button';
import { Input } from './Input/Input';
import { Select } from './Select/Select';
import { Slider } from './Slider/Slider';
import { Toggle } from './Toggle/Toggle';
import { Stack } from '../../interface/layout/Stack/Stack';
import { Cluster } from '../../interface/layout/Cluster/Cluster';
import { Box } from '../../interface/layout/Box/Box';
import { Center } from '../../interface/layout/Center/Center';

const meta: Meta = {
  title: 'INTERFACE/Control',
};

export default meta;

const Section = ({ title, description, children }: { title: string; description: string, children: React.ReactNode }) => (
  <Box padding="loose" border="subtle" background="panel">
    <Stack gap="loose">
      <div>
        <h3 style={{ margin: '0 0 0.25rem 0' }}>{title}</h3>
        <p style={{ margin: 0, color: 'var(--content-muted)' }}>{description}</p>
      </div>
      <Cluster gap="loose">
        {children}
      </Cluster>
    </Stack>
  </Box>
);

const InteractiveInput = () => {
  const [val, setVal] = useState('');
  return (
    <Stack gap="tight">
      <strong>Interactive</strong>
      <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Type here..." />
    </Stack>
  );
};

const InteractiveSelect = () => {
  const [val, setVal] = useState('opt1');
  return (
    <Stack gap="tight">
      <strong>Interactive</strong>
      <Select 
        value={val} 
        onChange={setVal}
        options={[
          { value: 'opt1', label: 'Warp Drive' },
          { value: 'opt2', label: 'Impulse Engine' },
          { value: 'opt3', label: 'Thrusters' }
        ]}
      />
    </Stack>
  );
};

const InteractiveSlider = () => {
  const [val, setVal] = useState(50);
  return (
    <Stack gap="tight">
      <strong>Interactive</strong>
      <Slider value={val} onChange={setVal} min={0} max={100} />
    </Stack>
  );
};

const InteractiveToggle = () => {
  const [val, setVal] = useState(false);
  return (
    <Stack gap="tight">
      <strong>Interactive</strong>
      <Toggle checked={val} onChange={setVal} label={val ? 'Online' : 'Offline'} />
    </Stack>
  );
};

export const A_Overview: StoryObj = {
  name: 'Overview',
  render: () => (
    <div style={{ height: '100dvh', overflowY: 'auto', padding: '2rem 0', fontFamily: 'sans-serif' }}>
      <Center max="lg">
        <Stack gap="section">
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Controls Overview</h2>
            <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
              A functional playground for all Control primitives. 
              Use this to test interactions, focus states, and disabled visual treatments side-by-side.
            </p>
          </div>

          <Section title="Button" description="Primary interaction trigger.">
            <Stack gap="tight">
              <strong>Interactive</strong>
              <Button variant="primary">Click Me</Button>
            </Stack>
            <Stack gap="tight">
              <strong>Disabled</strong>
              <Button variant="primary" disabled>Disabled</Button>
            </Stack>
          </Section>

          <Section title="Input" description="Text entry field.">
            <InteractiveInput />
            <Stack gap="tight">
              <strong>Disabled</strong>
              <Input placeholder="Restricted access..." disabled />
            </Stack>
          </Section>

          <Section title="Select" description="Native dropdown for picking from a list.">
            <InteractiveSelect />
            <Stack gap="tight">
              <strong>Disabled</strong>
              <Select 
                disabled 
                value="opt1" 
                onChange={() => {}}
                options={[
                  { value: 'opt1', label: 'Offline' }
                ]}
              />
            </Stack>
          </Section>

          <Section title="Slider" description="Range input for continuous analog values.">
            <InteractiveSlider />
            <Stack gap="tight">
              <strong>Disabled</strong>
              <Slider value={25} onChange={() => {}} min={0} max={100} disabled />
            </Stack>
          </Section>

          <Section title="Toggle" description="Binary switch for immediate state changes.">
            <InteractiveToggle />
            <Stack gap="tight">
              <strong>Disabled</strong>
              <Toggle disabled checked={false} onChange={() => {}} label="Offline" />
            </Stack>
          </Section>

        </Stack>
      </Center>
    </div>
  ),
};
