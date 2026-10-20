import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { DataTable } from '../DataTable/DataTable';

import storyStyles from '../informationStories.module.css';

const meta: Meta<typeof Kbd> = {
  title: 'INTERFACE/Information',
  component: Kbd,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Key glyph or modifier string',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const KbdStory: Story = {
  name: 'Kbd',
  args: {
    children: '⌘',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Kbd</h1>
        <p className={storyStyles.description}>
          Standardized keyboard keycap indicators for hotkeys, shortcuts, and navigational input cues.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div>
            <Kbd {...args} />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Single Keys</h2>
          <Cluster gap="dense">
            <Kbd>Space</Kbd>
            <Kbd>G</Kbd>
            <Kbd>O</Kbd>
            <Kbd>L</Kbd>
            <Kbd>/</Kbd>
            <Kbd>Esc</Kbd>
            <Kbd>Tab</Kbd>
          </Cluster>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Key Combinations</h2>
          <Stack gap="dense">
            <Cluster gap="tight" align="center">
              <Kbd>⌘</Kbd>
              <span>+</span>
              <Kbd>K</Kbd>
              <span>Command Palette / Universal Search</span>
            </Cluster>
            <Cluster gap="tight" align="center">
              <Kbd>Ctrl</Kbd>
              <span>+</span>
              <Kbd>F</Kbd>
              <span>Find in Viewport</span>
            </Cluster>
            <Cluster gap="tight" align="center">
              <Kbd>Shift</Kbd>
              <span>+</span>
              <Kbd>Tab</Kbd>
              <span>Previous Interactive Element</span>
            </Cluster>
            <Cluster gap="tight" align="center">
              <Kbd>Alt</Kbd>
              <span>+</span>
              <Kbd>D</Kbd>
              <span>Directions & Course Plotting</span>
            </Cluster>
          </Stack>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Cartographic Hotkey Reference</h2>
          <DataTable caption="Standard Cartographic Viewport Shortcuts">
            <DataTable.Head>
              <DataTable.Row>
                <DataTable.HeaderCell>Action</DataTable.HeaderCell>
                <DataTable.HeaderCell>Shortcut</DataTable.HeaderCell>
                <DataTable.HeaderCell>Scope</DataTable.HeaderCell>
              </DataTable.Row>
            </DataTable.Head>
            <DataTable.Body>
              <DataTable.Row>
                <DataTable.Cell>Focus Universal Search</DataTable.Cell>
                <DataTable.Cell>
                  <Kbd>/</Kbd>
                </DataTable.Cell>
                <DataTable.Cell>Global</DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Galaxy Overview View</DataTable.Cell>
                <DataTable.Cell>
                  <Kbd>G</Kbd>
                </DataTable.Cell>
                <DataTable.Cell>Spatial</DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>System Orbit View</DataTable.Cell>
                <DataTable.Cell>
                  <Kbd>O</Kbd>
                </DataTable.Cell>
                <DataTable.Cell>Spatial</DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Toggle Layer Catalog</DataTable.Cell>
                <DataTable.Cell>
                  <Kbd>L</Kbd>
                </DataTable.Cell>
                <DataTable.Cell>HUD</DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Center / Re-orient View</DataTable.Cell>
                <DataTable.Cell>
                  <Kbd>Space</Kbd>
                </DataTable.Cell>
                <DataTable.Cell>Spatial</DataTable.Cell>
              </DataTable.Row>
            </DataTable.Body>
          </DataTable>
        </section>
      </Stack>
    </div>
  ),
};
