import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MinimapOrientationSummary } from '../../../services/detailsService';
import { Minimap } from './Minimap';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const galaxyOrientationFixture: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'sol',
  anchorName: 'Sol (Origin Reference)',
  systemId: 'sol',
  systemName: 'Sol',
  sectorName: 'sector_+000_+000_+000',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
  orbitingBodyCount: 382,
  cameraAzimuthDeg: 45,
  cameraElevationDeg: 30,
  cameraDistance: 1200,
  focusedMarker: {
    id: 'sol',
    name: 'Sol',
    kind: 'star',
    role: 'focused',
    href: '/system/sol',
    coordinatesPc: [0, 0, 0],
  },
  selectedMarkers: [],
  markers: [
    {
      id: 'sol',
      name: 'Sol',
      kind: 'star',
      role: 'origin',
      href: '/system/sol',
      coordinatesPc: [0, 0, 0],
    },
    {
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      kind: 'star',
      role: 'anchor',
      href: '/system/alpha-centauri',
      coordinatesPc: [-0.47, 1.32, -0.33],
      distanceFromOriginPc: 1.34,
    },
  ],
};

const systemOrientationFixture: MinimapOrientationSummary = {
  scope: 'system',
  anchorId: 'sol',
  anchorName: 'Sol System',
  systemId: 'sol',
  systemName: 'Sol',
  outerOrbitalRadiusAu: 39.48,
  habitableZoneAu: [0.95, 1.37],
  orbitingBodyCount: 8,
  cameraAzimuthDeg: 20,
  cameraElevationDeg: 45,
  cameraDistance: 60,
  focusedMarker: {
    id: 'earth',
    name: 'Earth',
    kind: 'planet',
    role: 'focused',
    href: '/planet/earth',
    semiMajorAxisAu: 1.0,
  },
  selectedMarkers: [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      role: 'selected',
      href: '/planet/earth',
      semiMajorAxisAu: 1.0,
    },
  ],
  markers: [
    {
      id: 'sol',
      name: 'Sol',
      kind: 'star',
      role: 'origin',
      href: '/system/sol?focus=sol',
      semiMajorAxisAu: 0,
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      role: 'focused',
      href: '/planet/earth',
      semiMajorAxisAu: 1.0,
    },
    {
      id: 'mars',
      name: 'Mars',
      kind: 'planet',
      role: 'anchor',
      href: '/planet/mars',
      semiMajorAxisAu: 1.524,
    },
  ],
};

const planetOrientationFixture: MinimapOrientationSummary = {
  scope: 'planet',
  anchorId: 'earth',
  anchorName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  parentSemiMajorAxisAu: 1.0,
  orbitingBodyCount: 2,
  cameraAzimuthDeg: 15,
  cameraElevationDeg: 25,
  cameraDistance: 8,
  focusedMarker: {
    id: 'moon',
    name: 'Moon',
    kind: 'moon',
    role: 'focused',
    href: '/planet/earth?focus=moon',
  },
  selectedMarkers: [],
  markers: [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      role: 'origin',
      href: '/planet/earth',
    },
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      role: 'focused',
      href: '/planet/earth?focus=moon',
    },
  ],
};

interface MinimapStoryArgs {
  scope: 'galaxy' | 'system' | 'planet';
}

const meta: Meta<MinimapStoryArgs> = {
  title: 'DOMAIN/Navigation',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    scope: {
      control: 'radio',
      options: ['galaxy', 'system', 'planet'],
      description: 'Orientation scope for the minimap radar display',
    },
  },
};

export default meta;
type Story = StoryObj<MinimapStoryArgs>;

export const MinimapStory: Story = {
  name: 'Minimap',
  args: {
    scope: 'galaxy',
  },
  render: (args) => {
    const fixture =
      args.scope === 'system'
        ? systemOrientationFixture
        : args.scope === 'planet'
          ? planetOrientationFixture
          : galaxyOrientationFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>Minimap</h1>
          <p className={storyStyles.description}>
            Tactical orientation radar showing camera vector, celestial anchors, and spatial position.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.scope})
            </h2>
            <div className={storyStyles.panelContainer}>
              <Minimap orientation={fixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Galaxy Orientation</h2>
            <div className={storyStyles.panelContainer}>
              <Minimap orientation={galaxyOrientationFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>System Orientation (Sol)</h2>
            <div className={storyStyles.panelContainer}>
              <Minimap orientation={systemOrientationFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Planet Orientation (Earth-Moon)</h2>
            <div className={storyStyles.panelContainer}>
              <Minimap orientation={planetOrientationFixture} />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
