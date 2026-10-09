import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandPalette, type CommandPaletteItem } from './CommandPalette';

const sampleItems: CommandPaletteItem[] = [
  {
    id: 'sol',
    title: 'Sol System',
    subtitle: 'G2V • 0.00 pc • 8 Planets',
    category: 'system',
    badge: 'Primary',
  },
  {
    id: 'alpha-centauri',
    title: 'Alpha Centauri System',
    subtitle: 'Triple System • 1.34 pc • Rigil Kentaurus',
    category: 'system',
  },
  {
    id: 'proxima-b',
    title: 'Proxima Centauri b',
    subtitle: 'Exoplanet • 1.30 pc • Habitable Zone',
    category: 'planet',
    badge: 'HZ',
  },
  {
    id: 'sirius',
    title: 'Sirius (Alpha Canis Majoris)',
    subtitle: 'A1V + DA2 • 2.64 pc • Binary System',
    category: 'star',
  },
  {
    id: 'sector-origin',
    title: 'Sector [0, 0, 0]',
    subtitle: 'sector_+000_+000_+000 • Solar Neighborhood',
    category: 'coordinate',
  },
  {
    id: 'cmd-toggle-grid',
    title: 'Toggle Coordinate Grid',
    subtitle: 'Overlay 25pc cartographic grid',
    category: 'command',
  },
];

const meta: Meta<typeof CommandPalette> = {
  title: 'POC/Domain/CommandPalette',
  component: CommandPalette,
  argTypes: {
    isOpen: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

export const Open: Story = {
  args: {
    isOpen: true,
    items: sampleItems,
    onClose: () => console.log('Close CommandPalette'),
    onSelectItem: (item) => console.log('Selected item', item),
  },
};
