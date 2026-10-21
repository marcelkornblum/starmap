import type { Meta, StoryObj } from '@storybook/react-vite';
import { StarTypeCombinator } from './StarTypeCombinator';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const meta: Meta<typeof StarTypeCombinator> = {
  title: 'DOMAIN/Guide',
  component: StarTypeCombinator,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    initialClass: {
      control: 'select',
      options: ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'L', 'D'],
      description: 'Harvard spectral classification letter',
    },
    initialSubdivision: {
      control: 'select',
      options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      description: 'Decimal temperature subclass (0 hottest, 9 coolest)',
    },
    initialLuminosity: {
      control: 'select',
      options: ['I', 'III', 'IV', 'V', 'VII'],
      description: 'Yerkes luminosity class numeral',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StarTypeCombinator>;

export const StarTypeCombinatorStory: Story = {
  name: 'StarTypeCombinator',
  args: {
    initialClass: 'G',
    initialSubdivision: '2',
    initialLuminosity: 'V',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>StarTypeCombinator</h1>
        <p className={storyStyles.description}>
          Interactive Morgan-Keenan spectral classification explorer with physical parameter calculation and live 3D preview.
        </p>
      </header>

      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <StarTypeCombinator
            key={`${args.initialClass}-${args.initialSubdivision}-${args.initialLuminosity}`}
            {...args}
          />
        </section>
      </Stack>
    </div>
  ),
};
