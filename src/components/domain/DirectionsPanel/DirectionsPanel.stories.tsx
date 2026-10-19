import type { Meta, StoryObj } from '@storybook/react-vite';
import { DirectionsPanel } from './DirectionsPanel';
import { buildJourneyPlan } from '../../../services/journeyService';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';

const STORY_CORPUS: readonly CompactSearchEntry[] = [
  { i: 'sol', n: 'Sol', h: 1, p: [0, 0, 0], m: [-26.74, 'G2V', 8, 1] },
  { i: 'tau-ceti', n: 'Tau Ceti', p: [-2.61, 1.83, -1.72], m: [3.5, 'G8.5V', 4, 1] },
  { i: 'proxima-centauri', n: 'Proxima Centauri', p: [-0.963, -0.669, -0.589], m: [11.13, 'M5.5V', 2, 1] },
  { i: 'sirius', n: 'Sirius', p: [-1.61, 2.07, -0.63], m: [-1.46, 'A1V', 0] },
  { i: 'earth', n: 'Earth', k: 2, s: 'sol', p: [0, 0, 0], r: 3, A: 1.0, P: 365.256, z: 1 },
  { i: 'mars', n: 'Mars', k: 2, s: 'sol', p: [0, 0, 0], r: 4, A: 1.524, P: 686.98 },
];

const meta: Meta<typeof DirectionsPanel> = {
  title: 'DOMAIN/DirectionsPanel',
  component: DirectionsPanel,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DirectionsPanel>;

export const InterstellarOptionsList: Story = {
  name: 'Interstellar Options List',
  args: {
    journey: buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      corpus: STORY_CORPUS,
    }),
    activeDetent: 'partial',
  },
};

export const InterstellarOptionDetailRelativistic1G: Story = {
  name: 'Interstellar Option Detail (Relativistic 1G)',
  args: {
    journey: buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      selectedOptionId: 'rel-1g',
      corpus: STORY_CORPUS,
    }),
    activeDetent: 'partial',
  },
};

export const InterstellarOptionDetailFusion: Story = {
  name: 'Interstellar Option Detail (Fusion 0.1c)',
  args: {
    journey: buildJourneyPlan({
      stops: ['sol', 'tau-ceti'],
      selectedOptionId: 'fusion-01c',
      corpus: STORY_CORPUS,
    }),
    activeDetent: 'full',
  },
};

export const IntraSystemOptionsList: Story = {
  name: 'Intra-System Options List',
  args: {
    journey: buildJourneyPlan({
      stops: ['earth', 'mars'],
      corpus: STORY_CORPUS,
    }),
    activeDetent: 'partial',
  },
};

export const IntraSystemOptionDetailHohmann: Story = {
  name: 'Intra-System Option Detail (Hohmann Transfer)',
  args: {
    journey: buildJourneyPlan({
      stops: ['earth', 'mars'],
      selectedOptionId: 'hohmann',
      corpus: STORY_CORPUS,
    }),
    activeDetent: 'partial',
  },
};

export const MultiStepNetworkJourney: Story = {
  name: 'Multi-Step Network Journey',
  args: {
    journey: buildJourneyPlan({
      stops: ['sol', 'proxima-centauri', 'sirius'],
      corpus: STORY_CORPUS,
    }),
    activeDetent: 'full',
  },
};

export const ComingSoonGatedJourney: Story = {
  name: 'Coming Soon (Gated Route)',
  args: {
    journey: buildJourneyPlan({
      stops: ['sol', 'earth'],
      viewScope: 'galaxy',
      corpus: STORY_CORPUS,
    }),
    activeDetent: 'partial',
  },
};

