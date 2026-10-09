import type { Meta, StoryObj } from '@storybook/react-vite';
import { Well } from './Well';
import { Stack } from '../../layout/Stack/Stack';
import { Cluster } from '../../layout/Cluster/Cluster';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Well> = {
  title: 'INTERFACE/Surfaces',
  component: Well,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
    tabular: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Well>;

export const WellStory: Story = {
  name: 'Well',
  args: {
    padding: 'default',
    tabular: true,
    children: 'RA: 19h 50m 47.0s | Dec: +08° 52′ 06″ | Parallax: 194.95 ± 0.05 mas',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Well</h1>
        <p className={storyStyles.description}>
          Recessed surface container with physical lighting model and optional tabular typography for coordinates and telemetry data.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Well {...args} />
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Tabular Astronomical Telemetry</h2>
          <Well tabular padding="tight">
            <Stack gap="dense">
              <span>DISTANCE: 1.295 pc (4.22 ly)</span>
              <span>PROPER MOTION RA: -3775.40 mas/yr</span>
              <span>PROPER MOTION DEC: 769.33 mas/yr</span>
            </Stack>
          </Well>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Padding Densities</h2>
          <Cluster gap="dense">
            <Well padding="tight">Tight</Well>
            <Well padding="default">Default</Well>
            <Well padding="loose">Loose</Well>
          </Cluster>
        </section>
      </Stack>
    </div>
  ),
};
