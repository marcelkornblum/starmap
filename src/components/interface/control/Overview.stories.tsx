import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button/Button';
import { Input } from './Input/Input';
import { Select } from './Select/Select';
import { Slider } from './Slider/Slider';
import { Toggle } from './Toggle/Toggle';
import { Stack } from '../../interface/layout/Stack/Stack';
import { Cluster } from '../../interface/layout/Cluster/Cluster';
import { Box } from '../../interface/layout/Box/Box';
import { Grid } from '../../interface/layout/Grid/Grid';
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
      {children}
    </Stack>
  </Box>
);

export const Overview: StoryObj = {
  name: 'Overview',
  render: () => (
    <div style={{ height: '100dvh', overflowY: 'auto', padding: '2rem 0', fontFamily: 'sans-serif' }}>
      <Center max="lg">
        <Stack gap="section">
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Controls Overview</h2>
            <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
              A comprehensive unified view of all Control primitives in their various states. 
              Use this to compare sizing, contrast, and alignment across the entire suite of interaction elements.
            </p>
          </div>

          <Section 
            title="Button" 
            description="Primary interaction trigger. Available in various semantic variants and sizes." 
          >
            <Grid minWidth="sm" gap="loose">
              <Stack gap="tight">
                <strong>Primary</strong>
                <Cluster gap="tight">
                  <Button variant="primary">Default</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </Cluster>
              </Stack>
              <Stack gap="tight">
                <strong>Secondary</strong>
                <Cluster gap="tight">
                  <Button variant="secondary">Default</Button>
                  <Button variant="secondary" disabled>Disabled</Button>
                </Cluster>
              </Stack>
              <Stack gap="tight">
                <strong>Highlight</strong>
                <Cluster gap="tight">
                  <Button variant="highlight">Default</Button>
                  <Button variant="highlight" disabled>Disabled</Button>
                </Cluster>
              </Stack>
              <Stack gap="tight">
                <strong>Subtle</strong>
                <Cluster gap="tight">
                  <Button variant="subtle">Default</Button>
                  <Button variant="subtle" disabled>Disabled</Button>
                </Cluster>
              </Stack>
              <Stack gap="tight">
                <strong>Danger</strong>
                <Cluster gap="tight">
                  <Button variant="danger">Default</Button>
                  <Button variant="danger" disabled>Disabled</Button>
                </Cluster>
              </Stack>
            </Grid>
          </Section>

          <Section 
            title="Input" 
            description="Text entry field for short-form alphanumeric data." 
          >
            <Cluster gap="loose">
              <Stack gap="tight">
                <strong>Default</strong>
                <Input placeholder="Enter comms frequency..." />
              </Stack>
              <Stack gap="tight">
                <strong>Disabled</strong>
                <Input placeholder="Restricted access..." disabled />
              </Stack>
              <Stack gap="tight">
                <strong>With Value</strong>
                <Input defaultValue="Alpha Centauri" />
              </Stack>
            </Cluster>
          </Section>

          <Section 
            title="Select" 
            description="Native dropdown for picking from a constrained list of options." 
          >
            <Cluster gap="loose">
              <Stack gap="tight">
                <strong>Default</strong>
                <Select 
                  value="opt1" 
                  onChange={() => {}}
                  options={[
                    { value: 'opt1', label: 'Warp Drive' },
                    { value: 'opt2', label: 'Impulse Engine' },
                    { value: 'opt3', label: 'Thrusters' }
                  ]}
                />
              </Stack>
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
            </Cluster>
          </Section>

          <Section 
            title="Slider" 
            description="Range input for selecting continuous analog values." 
          >
            <Grid minWidth="md" gap="loose">
              <Stack gap="tight">
                <strong>Default</strong>
                <Slider value={50} onChange={() => {}} min={0} max={100} />
              </Stack>
              <Stack gap="tight">
                <strong>Disabled</strong>
                <Slider value={25} onChange={() => {}} min={0} max={100} disabled />
              </Stack>
            </Grid>
          </Section>

          <Section 
            title="Toggle" 
            description="Binary switch for instantaneous state changes." 
          >
            <Cluster gap="loose">
              <Stack gap="tight">
                <strong>Off</strong>
                <Toggle checked={false} onChange={() => {}} />
              </Stack>
              <Stack gap="tight">
                <strong>On</strong>
                <Toggle checked={true} onChange={() => {}} />
              </Stack>
              <Stack gap="tight">
                <strong>Disabled (Off)</strong>
                <Toggle disabled checked={false} onChange={() => {}} />
              </Stack>
              <Stack gap="tight">
                <strong>Disabled (On)</strong>
                <Toggle disabled checked={true} onChange={() => {}} />
              </Stack>
            </Cluster>
          </Section>

        </Stack>
      </Center>
    </div>
  ),
};
