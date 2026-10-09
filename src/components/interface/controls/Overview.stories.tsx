import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from './Button/Button';
import { Input } from './Input/Input';
import { Select } from './Select/Select';
import { Slider } from './Slider/Slider';
import { Toggle } from './Toggle/Toggle';
import { Stack } from '../layouts/Stack/Stack';
import { Cluster } from '../layouts/Cluster/Cluster';
import { Box } from '../layouts/Box/Box';
import { Center } from '../layouts/Center/Center';
import { Grid } from '../layouts/Grid/Grid';
import styles from './Overview.module.css';

const meta: Meta = {
  title: 'INTERFACE/Controls',
};

export default meta;

const Section = ({ title, description, children }: { title: string; description: string, children: React.ReactNode }) => (
  <Box padding="loose" border="subtle" background="panel">
    <Stack gap="loose">
      <div>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <p className={styles.sectionDescription}>{description}</p>
      </div>
      <Cluster gap="loose">
        {children}
      </Cluster>
    </Stack>
  </Box>
);

const InteractiveInput = ({ status, placeholder = 'Type here...' }: { status?: 'error' | 'success', placeholder?: string }) => {
  const [val, setVal] = useState('');
  return (
    <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} status={status} />
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

export const Overview: StoryObj = {
  name: 'Overview',
  render: () => (
    <div className={styles.pageContainer}>
      <Center max="lg">
        <Stack gap="section">
          <div className={styles.headerContainer}>
            <h2 className={styles.mainTitle}>Controls Overview</h2>
            <p className={styles.mainDescription}>
              A functional playground for all Control primitives. 
              Use this to test interactions, focus states, and disabled visual treatments side-by-side.
            </p>
          </div>

          <Section title="Button" description="Primary interaction trigger. Available in various semantic variants and sizes.">
            <Grid minWidth="sm" gap="loose">
              <Stack gap="tight">
                <strong>Default</strong>
                <Cluster gap="tight">
                  <Button>Interactive</Button>
                  <Button disabled>Disabled</Button>
                </Cluster>
              </Stack>
              <Stack gap="tight">
                <strong>Primary</strong>
                <Cluster gap="tight">
                  <Button variant="primary">Interactive</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </Cluster>
              </Stack>
              <Stack gap="tight">
                <strong>Subtle</strong>
                <Cluster gap="tight">
                  <Button variant="subtle">Interactive</Button>
                  <Button variant="subtle" disabled>Disabled</Button>
                </Cluster>
              </Stack>
              <Stack gap="tight">
                <strong>Danger</strong>
                <Cluster gap="tight">
                  <Button variant="danger">Interactive</Button>
                  <Button variant="danger" disabled>Disabled</Button>
                </Cluster>
              </Stack>
            </Grid>
          </Section>

          <Section title="Input" description="Text entry field for short-form alphanumeric data. Includes status states.">
            <Cluster gap="loose">
              <Stack gap="tight">
                <strong>Default</strong>
                <InteractiveInput placeholder="Enter value..." />
              </Stack>
              <Stack gap="tight">
                <strong>Disabled</strong>
                <Input placeholder="Restricted access..." disabled />
              </Stack>
              <Stack gap="tight">
                <strong>Error Status</strong>
                <InteractiveInput status="error" placeholder="Critical error..." />
              </Stack>
              <Stack gap="tight">
                <strong>Error (Disabled)</strong>
                <Input status="error" placeholder="Critical error..." disabled />
              </Stack>
            </Cluster>
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
