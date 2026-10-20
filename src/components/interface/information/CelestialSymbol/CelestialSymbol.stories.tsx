import type { Meta, StoryObj } from '@storybook/react-vite';
import { CelestialSymbol, type CelestialSymbolType } from './CelestialSymbol';
import { CelestialBadge } from './CelestialBadge';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import storyStyles from '../informationStories.module.css';

interface CelestialSymbolStoryProps {
  type: CelestialSymbolType;
  size: 'sm' | 'md' | 'lg';
  showLabel: boolean;
  asBadge: boolean;
}

const ALL_SYMBOLS: readonly CelestialSymbolType[] = [
  // Group A: 3D Reticle & Planetary Taxonomy
  'star',
  'stellar-system',
  'brown-dwarf',
  'white-dwarf',
  'neutron-star',
  'hazard',
  'black-hole',
  'barycentre',
  'stellar-cluster',
  'construct',
  'terrestrial',
  'super-earth',
  'gas-giant',
  'ice-giant',
  // Group B: Sub-Planetary, Disk, Structure, & Environmental Taxonomy
  'dwarf-planet',
  'moon',
  'asteroid',
  'comet',
  'belt',
  'asteroid-belt',
  'kuiper-belt',
  'debris-disk',
  'nebula',
  'ism',
  'supernova-remnant',
  'habitable-zone',
];

const meta: Meta<CelestialSymbolStoryProps> = {
  title: 'INTERFACE/Information',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ALL_SYMBOLS,
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    showLabel: {
      control: 'boolean',
    },
    asBadge: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<CelestialSymbolStoryProps>;

export const CelestialSymbolStory: Story = {
  name: 'CelestialSymbol',
  args: {
    type: 'terrestrial',
    size: 'md',
    showLabel: true,
    asBadge: false,
  },
  render: ({ type, size, showLabel, asBadge }) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>CelestialSymbol & CelestialBadge</h1>
        <p className={storyStyles.description}>
          Universal SVG cartographic symbols and regulated badges across the 19 canonical celestial geometries.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div>
            {asBadge ? (
              <CelestialBadge
                type={type}
                size={size}
                showLabel={showLabel}
                interactive
              />
            ) : (
              <CelestialSymbol
                type={type}
                size={size}
                showLabel={showLabel}
              />
            )}
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Group A: Reticle & Planetary Taxonomy (Symbols)</h2>
          <Cluster gap="dense" align="center">
            {ALL_SYMBOLS.slice(0, 14).map((sym) => (
              <CelestialSymbol key={sym} type={sym} size="md" showTooltip />
            ))}
          </Cluster>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Group A: Reticle & Planetary Taxonomy (Badges)</h2>
          <Cluster gap="dense" align="center">
            {ALL_SYMBOLS.slice(0, 14).map((sym) => (
              <CelestialBadge key={sym} type={sym} size="sm" interactive />
            ))}
          </Cluster>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Group B: Sub-Planetary, Disks & Phenomena (Symbols)</h2>
          <Cluster gap="dense" align="center">
            {ALL_SYMBOLS.slice(14).map((sym) => (
              <CelestialSymbol key={sym} type={sym} size="md" showTooltip />
            ))}
          </Cluster>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Group B: Sub-Planetary, Disks & Phenomena (Badges)</h2>
          <Cluster gap="dense" align="center">
            {ALL_SYMBOLS.slice(14).map((sym) => (
              <CelestialBadge key={sym} type={sym} size="sm" interactive />
            ))}
          </Cluster>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Labeled Badges with Tooltips</h2>
          <Cluster gap="dense" align="center">
            <CelestialBadge type="terrestrial" showLabel interactive />
            <CelestialBadge type="super-earth" showLabel interactive />
            <CelestialBadge type="habitable-zone" showLabel interactive />
            <CelestialBadge type="stellar-cluster" showLabel interactive />
            <CelestialBadge type="asteroid-belt" showLabel interactive />
          </Cluster>
        </section>
      </Stack>
    </div>
  ),
};
