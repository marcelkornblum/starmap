import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Popover } from './Popover';
import { Stack } from '../../layout/Stack/Stack';
import { Cluster } from '../../layout/Cluster/Cluster';
import { Button } from '../../control/Button/Button';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Popover> = {
  title: 'INTERFACE/Surfaces',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    isOpen: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Popover>;

const PopoverDemo = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Popover</h1>
        <p className={storyStyles.description}>
          Positioned overlay card anchored relative to a trigger element with directional offsets.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Trigger</h2>
          <Cluster gap="default" align="center">
            <Popover
              isOpen={open}
              position="bottom"
              trigger={
                <Button variant="default" onClick={() => setOpen(!open)}>
                  Toggle Stellar Details
                </Button>
              }
            >
              <Stack gap="tight">
                <strong>Proxima Centauri</strong>
                <span>Spectral Class: M5.5Ve</span>
                <span>Distance: 1.295 pc</span>
              </Stack>
            </Popover>
          </Cluster>
        </section>
      </Stack>
    </div>
  );
};

export const PopoverStory: Story = {
  name: 'Popover',
  render: () => <PopoverDemo />,
};
