import type { Meta, StoryObj } from '@storybook/react';
import { Unit } from './Unit';
import { Stack } from '../../layout/Stack/Stack';
import { Cluster } from '../../layout/Cluster/Cluster';
import styles from './Unit.stories.module.css';

const meta = {
  title: 'Primitives/Data/Unit',
  component: Unit,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'The unit symbol or string (e.g. AU, km/s, ly, M☉)',
    },
    inParens: {
      control: 'boolean',
      description: 'Whether to enclose the unit in parentheses',
    },
  },
  args: {
    children: 'AU',
    inParens: false,
  },
} satisfies Meta<typeof Unit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'AU',
    inParens: false,
  },
};

export const InParentheses: Story = {
  args: {
    children: 'AU',
    inParens: true,
  },
};

export const InDifferentContextSizes: Story = {
  render: () => (
    <Stack gap="default">
      <div>
        <span className={styles.scale3}>
          4.246 <Unit>ly</Unit>
        </span>
      </div>
      <div>
        <span className={styles.scale1}>
          1.000 <Unit>AU</Unit>
        </span>
      </div>
      <div>
        <span className={styles.scale0}>
          300,000 <Unit>km/s</Unit>
        </span>
      </div>
      <div>
        <span className={styles.scaleNeg1}>
          Period <Unit>d</Unit>
        </span>
      </div>
      <div>
        <span className={styles.scaleNeg2}>
          Orbital radius <Unit>km</Unit>
        </span>
      </div>
    </Stack>
  ),
};

export const CommonAstronomicalUnits: Story = {
  render: () => (
    <Stack gap="dense">
      <Cluster gap="dense" align="baseline">
        <span>Distance: 8.12</span>
        <Unit>kpc</Unit>
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Velocity: -220.4</span>
        <Unit>km/s</Unit>
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Mass: 1.04</span>
        <Unit>M☉</Unit>
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Radius: 1.17</span>
        <Unit>R⊕</Unit>
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Parallax: 768.87</span>
        <Unit>mas</Unit>
      </Cluster>
    </Stack>
  ),
};
