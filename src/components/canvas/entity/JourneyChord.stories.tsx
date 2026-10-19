import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { JourneyChord } from './JourneyChord';
import { SpatialFrameProvider, GALACTIC_FRAME, SYSTEM_FRAME } from '../instrument';
import type { JourneyChordLeg } from '../cartography/journeyChordGeometry';

const meta: Meta<typeof JourneyChord> = {
  title: 'CANVAS/JourneyChord',
  component: JourneyChord,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof JourneyChord>;

const interstellarLegs: JourneyChordLeg[] = [
  {
    id: 'sol-tau-ceti',
    stepIndex: 0,
    fromId: 'sol',
    fromName: 'Sol',
    toId: 'tau-ceti',
    toName: 'Tau Ceti',
    fromPosition: [0, 0, 0],
    toPosition: [-1.62, 2.76, -1.97],
    distanceLabel: '11.9 ly (3.65 pc)',
    secondaryLabel: 'Δz = -1.97 pc · 11.9 yr signal delay',
    methodId: 'torchship-1g',
    lineStyle: 'solid',
  },
];

const multiHopLegs: JourneyChordLeg[] = [
  {
    id: 'eps-eri-tau-ceti',
    stepIndex: 0,
    fromId: 'epsilon-eridani',
    fromName: 'Epsilon Eridani',
    toId: 'tau-ceti',
    toName: 'Tau Ceti',
    fromPosition: [0.03, 3.21, -0.66],
    toPosition: [-1.62, 2.76, -1.97],
    distanceLabel: '5.5 ly (1.68 pc)',
    secondaryLabel: 'Leg 1 · 5.5 yr comms',
    methodId: 'fusion-0.05c',
    lineStyle: 'solid',
  },
  {
    id: 'tau-ceti-82-eri',
    stepIndex: 1,
    fromId: 'tau-ceti',
    fromName: 'Tau Ceti',
    toId: '82-g-eridani',
    toName: '82 G. Eridani',
    fromPosition: [-1.62, 2.76, -1.97],
    toPosition: [-3.18, 4.22, -3.45],
    distanceLabel: '7.8 ly (2.40 pc)',
    secondaryLabel: 'Leg 2 · 7.8 yr comms',
    methodId: 'fusion-0.05c',
    lineStyle: 'dashed',
  },
];

const intraSystemLegs: JourneyChordLeg[] = [
  {
    id: 'earth-mars',
    stepIndex: 0,
    fromId: 'earth',
    fromName: 'Earth',
    toId: 'mars',
    toName: 'Mars',
    fromPosition: [1.0, 0.0, 0.0],
    toPosition: [1.524, 0.0, 0.049],
    distanceLabel: '0.52 AU (78.3M km)',
    secondaryLabel: '4.3 min signal delay',
    methodId: 'hohmann-transfer',
    lineStyle: 'solid',
  },
];

export const InterstellarChordStory: Story = {
  name: 'Interstellar Chord (Sol → Tau Ceti)',
  args: {
    legs: interstellarLegs,
    activeMethodId: 'torchship-1g',
    showElevationProjection: true,
    showLabels: true,
    visible: true,
  },
  render: (args) => (
    <StoryCanvas
      title="Interstellar Journey Chord"
      description="Direct 3D kinematic chord from Sol to Tau Ceti showing trajectory line, elevation projection, and screen-space callouts."
      frame={GALACTIC_FRAME}
      cameraDistance={15}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <JourneyChord {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};

export const MultiHopNetworkChordStory: Story = {
  name: 'Multi-Hop Network Chord (Epsilon Eridani → Tau Ceti → 82 G. Eridani)',
  args: {
    legs: multiHopLegs,
    activeMethodId: 'fusion-0.05c',
    showElevationProjection: true,
    showLabels: true,
    visible: true,
  },
  render: (args) => (
    <StoryCanvas
      title="Multi-Hop Network Journey Chord"
      description="Sequential multi-stop route traversal with intermediate waypoints and per-leg line styles."
      frame={GALACTIC_FRAME}
      cameraDistance={20}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <JourneyChord {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};

export const IntraSystemTransferChordStory: Story = {
  name: 'Intra-System Transfer Chord (Earth → Mars)',
  args: {
    legs: intraSystemLegs,
    activeMethodId: 'hohmann-transfer',
    showElevationProjection: true,
    showLabels: true,
    visible: true,
  },
  render: (args) => (
    <StoryCanvas
      title="Intra-System Transfer Chord"
      description="Planetary transfer trajectory vector between Earth and Mars with orbital range and light-minute delay."
      frame={SYSTEM_FRAME}
      cameraDistance={4}
    >
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <JourneyChord {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
