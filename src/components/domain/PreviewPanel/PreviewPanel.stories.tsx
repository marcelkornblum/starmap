import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FocusedPreviewSummary } from '../../../services/details/detailsNavigationTypes';
import { PreviewPanel } from './PreviewPanel';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const solSystemPreviewFixture: FocusedPreviewSummary = {
  targetId: 'sol',
  targetName: 'Sol System',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  detailsHref: '/system/sol',
  reticleType: 'stellar-system',
  primaryInclinationDeg: 60.19,
  orbitElements: [
    {
      id: 'mercury',
      name: 'Mercury',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 1,
      semiMajorAxisAu: 0.387,
      eccentricity: 0.2056,
      inclinationDeg: 7.0,
      inHabitableZone: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 2,
      semiMajorAxisAu: 1.0,
      eccentricity: 0.0167,
      inclinationDeg: 0.0,
      inHabitableZone: true,
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      kind: 'planet',
      symbolType: 'gas-giant',
      orbitRank: 3,
      semiMajorAxisAu: 5.204,
      eccentricity: 0.0489,
      inclinationDeg: 1.303,
      inHabitableZone: false,
    },
    {
      id: 'uranus',
      name: 'Uranus',
      kind: 'planet',
      symbolType: 'ice-giant',
      orbitRank: 4,
      semiMajorAxisAu: 19.218,
      eccentricity: 0.0463,
      inclinationDeg: 0.773,
      inHabitableZone: false,
    },
  ],
};

const unmeasuredExoplanetFixture: FocusedPreviewSummary = {
  targetId: 'tau-ceti',
  targetName: 'Tau Ceti',
  systemId: 'tau-ceti',
  systemName: 'Tau Ceti',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  detailsHref: '/system/tau-ceti',
  reticleType: 'stellar-system',
  primaryInclinationDeg: 0,
  orbitElements: [
    {
      id: 'tau-ceti-g',
      name: 'Tau Ceti g',
      kind: 'planet',
      symbolType: 'super-earth',
      orbitRank: 1,
      semiMajorAxisAu: 0.133,
      inHabitableZone: false,
    },
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 2,
      semiMajorAxisAu: 0.538,
      inHabitableZone: true,
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
  detailsHref: '/system/sol?focus=sol',
  reticleType: 'star',
  primaryInclinationDeg: 60.19,
  orbitElements: [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 3,
      semiMajorAxisAu: 1.0,
      eccentricity: 0.0167,
      inclinationDeg: 0.0,
      inHabitableZone: true,
    },
  ],
};

const earthPreviewFixture: FocusedPreviewSummary = {
  targetId: 'earth',
  targetName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'planet',
  previewMode: 'planetary-system',
  detailsHref: '/planet/earth',
  reticleType: 'terrestrial',
  primarySemiMajorAxisAu: 1.0,
  primaryEccentricity: 0.0167,
  primaryInclinationDeg: 23.44,
  orbitElements: [
    {
      id: 'iss',
      name: 'International Space Station',
      kind: 'spacecraft',
      symbolType: 'spacecraft',
      orbitRank: 1,
      inHabitableZone: false,
    },
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      symbolType: 'moon',
      orbitRank: 2,
      semiMajorAxisAu: 0.00257,
      eccentricity: 0.0549,
      inclinationDeg: 5.14,
      inHabitableZone: false,
    },
  ],
};

const uranusPreviewFixture: FocusedPreviewSummary = {
  targetId: 'uranus',
  targetName: 'Uranus',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'planet',
  previewMode: 'planetary-system',
  detailsHref: '/planet/uranus',
  reticleType: 'ice-giant',
  primarySemiMajorAxisAu: 19.218,
  primaryEccentricity: 0.0463,
  primaryInclinationDeg: 97.77,
  orbitElements: [
    {
      id: 'titania',
      name: 'Titania',
      kind: 'moon',
      symbolType: 'moon',
      orbitRank: 1,
      inHabitableZone: false,
    },
    {
      id: 'oberon',
      name: 'Oberon',
      kind: 'moon',
      symbolType: 'moon',
      orbitRank: 2,
      inHabitableZone: false,
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
  detailsHref: '/system/sol?focus=ceres',
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
  detailsHref: '/galaxy?focus=orion-nebula',
  primaryInclinationDeg: 0,
  orbitElements: [],
};

type PreviewFixtureKey =
  | 'sol-system'
  | 'exoplanet-unmeasured'
  | 'star'
  | 'earth'
  | 'uranus'
  | 'minor-body'
  | 'structure';

const FIXTURES_BY_KEY: Record<PreviewFixtureKey, FocusedPreviewSummary> = {
  'sol-system': solSystemPreviewFixture,
  'exoplanet-unmeasured': unmeasuredExoplanetFixture,
  star: starPreviewFixture,
  earth: earthPreviewFixture,
  uranus: uranusPreviewFixture,
  'minor-body': minorBodyPreviewFixture,
  structure: structurePreviewFixture,
};

interface PreviewPanelStoryArgs {
  fixtureKey: PreviewFixtureKey;
}

const meta: Meta<PreviewPanelStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    fixtureKey: {
      control: 'select',
      options: [
        'sol-system',
        'exoplanet-unmeasured',
        'star',
        'earth',
        'uranus',
        'minor-body',
        'structure',
      ],
      description: 'Preset focus preview fixture demonstrating inclination and CelestialSymbol reticles',
    },
  },
};

export default meta;
type Story = StoryObj<PreviewPanelStoryArgs>;

export const PreviewPanelStory: Story = {
  name: 'PreviewPanel',
  args: {
    fixtureKey: 'sol-system',
  },
  render: (args) => {
    const fixture = FIXTURES_BY_KEY[args.fixtureKey] ?? solSystemPreviewFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>PreviewPanel</h1>
          <p className={storyStyles.description}>
            Minimal borderless fixed-outer-view orientation schematic comparing the parent reference
            plane against the target orbital or equatorial plane with CelestialSymbol reticles.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.fixtureKey})
            </h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={fixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Sol System (60.19° Ecliptic Tilt)</h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={solSystemPreviewFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Unmeasured Exoplanet System (Tau Ceti · 0° Neutral)
            </h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={unmeasuredExoplanetFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Earth Sub-System (23.44° Axial Obliquity)
            </h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={earthPreviewFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Uranus Sub-System (97.77° Extreme Axial Tilt)
            </h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={uranusPreviewFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Minor Body Orbit (1 Ceres · 10.59°)</h2>
            <div className={storyStyles.panelContainer}>
              <PreviewPanel preview={minorBodyPreviewFixture} />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
