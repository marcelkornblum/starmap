import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import { Stack } from '../../interface';
import storyStyles from '../domainStories.module.css';
import { VisorScalePill } from './VisorScalePill';

const galaxyOrientation: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'anchor-origin',
  anchorName: 'Origin Reference',
  systemId: 'sys-origin',
  systemName: 'Origin',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
  cameraAzimuthDeg: 45,
  cameraElevationDeg: 30,
  cameraDistance: 42,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const systemOrientation: MinimapOrientationSummary = {
  scope: 'system',
  anchorId: 'sys-origin',
  anchorName: 'Origin System',
  systemId: 'sys-origin',
  systemName: 'Origin',
  planeInclinationDeg: 60.19,
  outerOrbitalRadiusAu: 30.1,
  orbitingBodyCount: 8,
  cameraAzimuthDeg: 20,
  cameraElevationDeg: 45,
  cameraDistance: 15,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const planetOrientation: MinimapOrientationSummary = {
  scope: 'planet',
  anchorId: 'planet-origin',
  anchorName: 'Origin Planet',
  systemId: 'sys-origin',
  systemName: 'Origin',
  planeInclinationDeg: 60.19,
  axialTiltDeg: 23.44,
  parentSemiMajorAxisAu: 1.0,
  orbitingBodyCount: 1,
  cameraAzimuthDeg: 10,
  cameraElevationDeg: 18,
  cameraDistance: 8,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const meta: Meta<typeof VisorScalePill> = {
  title: 'DOMAIN/Navigation',
  component: VisorScalePill,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VisorScalePill>;

export const VisorScalePillStory: Story = {
  name: 'VisorScalePill',
  render: () => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>VisorScalePill</h1>
        <p className={storyStyles.description}>
          Compact mobile visor instrument displaying focal scale and elevation, resetting camera orientation to North on tap.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Galaxy Scope</h2>
          <div className={storyStyles.panelContainer}>
            <VisorScalePill orientation={galaxyOrientation} />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>System Scope</h2>
          <div className={storyStyles.panelContainer}>
            <VisorScalePill orientation={systemOrientation} />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Planet Scope</h2>
          <div className={storyStyles.panelContainer}>
            <VisorScalePill orientation={planetOrientation} />
          </div>
        </section>
      </Stack>
    </div>
  ),
};
