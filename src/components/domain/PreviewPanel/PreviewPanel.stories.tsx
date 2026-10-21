import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FocusedPreviewSummary } from '../../../services/detailsService';
import { PreviewPanel } from './PreviewPanel';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const systemPreviewFixture: FocusedPreviewSummary = {
  targetId: 'sol',
  targetName: 'Sol System',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  orbitElements: [
    {
      id: 'mercury',
      name: 'Mercury',
      kind: 'planet',
      orbitRank: 1,
      semiMajorAxisAu: 0.387,
      eccentricity: 0.2056,
      inclinationDeg: 7.0,
      inHabitableZone: false,
    },
    {
      id: 'venus',
      name: 'Venus',
      kind: 'planet',
      orbitRank: 2,
      semiMajorAxisAu: 0.723,
      eccentricity: 0.0067,
      inclinationDeg: 3.39,
      inHabitableZone: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      orbitRank: 3,
      semiMajorAxisAu: 1.0,
      eccentricity: 0.0167,
      inclinationDeg: 0.0,
      inHabitableZone: true,
    },
    {
      id: 'mars',
      name: 'Mars',
      kind: 'planet',
      orbitRank: 4,
      semiMajorAxisAu: 1.524,
      eccentricity: 0.0934,
      inclinationDeg: 1.85,
      inHabitableZone: false,
    },
  ],
};

const starPreviewFixture: FocusedPreviewSummary = {
  targetId: 'sol',
  targetName: 'Sol',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'star',
  previewMode: 'system-orbits',
  orbitElements: [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      orbitRank: 3,
      semiMajorAxisAu: 1.0,
      eccentricity: 0.0167,
      inclinationDeg: 0.0,
      inHabitableZone: true,
    },
  ],
};

const planetPreviewFixture: FocusedPreviewSummary = {
  targetId: 'earth',
  targetName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'planet',
  previewMode: 'planetary-system',
  primarySemiMajorAxisAu: 1.0,
  primaryEccentricity: 0.0167,
  primaryInclinationDeg: 0.0,
  orbitElements: [
    {
      id: 'moon',
      name: 'Moon',
      kind: 'minor-body',
      orbitRank: 1,
      semiMajorAxisAu: 0.00257,
      eccentricity: 0.0549,
      inclinationDeg: 5.14,
      inHabitableZone: true,
    },
  ],
};

const minorBodyPreviewFixture: FocusedPreviewSummary = {
  targetId: 'ceres',
  targetName: '1 Ceres',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'minor-body',
  previewMode: 'object-orbit',
  primarySemiMajorAxisAu: 2.767,
  primaryEccentricity: 0.076,
  primaryInclinationDeg: 10.59,
  orbitElements: [],
};

const structurePreviewFixture: FocusedPreviewSummary = {
  targetId: 'orion-nebula',
  targetName: 'Orion Nebula (M42)',
  systemId: 'orion-nebula',
  systemName: 'Orion Nebula',
  focusedKind: 'structure',
  previewMode: 'object-orbit',
  orbitElements: [],
};

const FIXTURES_BY_KIND: Record<string, FocusedPreviewSummary> = {
  system: systemPreviewFixture,
  star: starPreviewFixture,
  planet: planetPreviewFixture,
  'minor-body': minorBodyPreviewFixture,
  structure: structurePreviewFixture,
};

interface PreviewPanelStoryArgs {
  focusedKind: 'system' | 'star' | 'planet' | 'minor-body' | 'structure';
}

const meta: Meta<PreviewPanelStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    focusedKind: {
      control: 'select',
      options: ['system', 'star', 'planet', 'minor-body', 'structure'],
      description: 'Entity classification of the focused celestial object',
    },
  },
};

export default meta;
type Story = StoryObj<PreviewPanelStoryArgs>;

export const PreviewPanelStory: Story = {
  name: 'PreviewPanel',
  args: {
    focusedKind: 'system',
  },
  render: (args) => {
    const fixture = FIXTURES_BY_KIND[args.focusedKind] ?? systemPreviewFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>PreviewPanel</h1>
          <p className={storyStyles.description}>
            Interactive orbital schematic preview displaying concentric bodies, orbital rings, and habitable zone bounds.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.focusedKind})
            </h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={fixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>System Scope (Inner Planets)</h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={systemPreviewFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Planetary Sub-System (Earth-Moon)</h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={planetPreviewFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Minor Body Orbit (Ceres)</h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={minorBodyPreviewFixture} />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
