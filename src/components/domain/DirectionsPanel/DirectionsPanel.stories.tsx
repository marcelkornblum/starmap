import type { Meta, StoryObj } from '@storybook/react-vite';
import { DirectionsPanel } from './DirectionsPanel';
import { buildJourneyPlan } from '../../../services/journeyService';
import type { CompactSearchEntry } from '../../../utils/compactDataCodec';
import type { DetentLevel } from '../../interface/surfaces/DetentSheet';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const STORY_CORPUS: readonly CompactSearchEntry[] = [
  { i: 'sol', n: 'Sol', h: 1, p: [0, 0, 0], m: [-26.74, 'G2V', 8, 1] },
  { i: 'tau-ceti', n: 'Tau Ceti', p: [-2.61, 1.83, -1.72], m: [3.5, 'G8.5V', 4, 1] },
  {
    i: 'proxima-centauri',
    n: 'Proxima Centauri',
    p: [-0.963, -0.669, -0.589],
    m: [11.13, 'M5.5V', 2, 1],
  },
  { i: 'sirius', n: 'Sirius', p: [-1.61, 2.07, -0.63], m: [-1.46, 'A1V', 0] },
  {
    i: 'earth',
    n: 'Earth',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    r: 3,
    A: 1.0,
    P: 365.256,
    z: 1,
  },
  {
    i: 'mars',
    n: 'Mars',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    r: 4,
    A: 1.524,
    P: 686.98,
  },
];

type ScenarioKey =
  | 'interstellar-options'
  | 'interstellar-relativistic-1g'
  | 'interstellar-fusion'
  | 'intra-system-options'
  | 'intra-system-hohmann'
  | 'multi-step-network'
  | 'coming-soon-gated';

const SCENARIOS: Record<ScenarioKey, ReturnType<typeof buildJourneyPlan>> = {
  'interstellar-options': buildJourneyPlan({
    stops: ['sol', 'tau-ceti'],
    corpus: STORY_CORPUS,
  }),
  'interstellar-relativistic-1g': buildJourneyPlan({
    stops: ['sol', 'tau-ceti'],
    selectedOptionId: 'rel-1g',
    corpus: STORY_CORPUS,
  }),
  'interstellar-fusion': buildJourneyPlan({
    stops: ['sol', 'tau-ceti'],
    selectedOptionId: 'fusion-01c',
    corpus: STORY_CORPUS,
  }),
  'intra-system-options': buildJourneyPlan({
    stops: ['earth', 'mars'],
    corpus: STORY_CORPUS,
  }),
  'intra-system-hohmann': buildJourneyPlan({
    stops: ['earth', 'mars'],
    selectedOptionId: 'hohmann',
    corpus: STORY_CORPUS,
  }),
  'multi-step-network': buildJourneyPlan({
    stops: ['sol', 'proxima-centauri', 'sirius'],
    corpus: STORY_CORPUS,
  }),
  'coming-soon-gated': buildJourneyPlan({
    stops: ['sol', 'earth'],
    viewScope: 'galaxy',
    corpus: STORY_CORPUS,
  }),
};

interface DirectionsPanelStoryArgs {
  mode: ScenarioKey;
  detent: DetentLevel;
}

const meta: Meta<DirectionsPanelStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    mode: {
      control: 'select',
      options: [
        'interstellar-options',
        'interstellar-relativistic-1g',
        'interstellar-fusion',
        'intra-system-options',
        'intra-system-hohmann',
        'multi-step-network',
        'coming-soon-gated',
      ],
      description: 'Journey route mode scenario and propulsion selection',
    },
    detent: {
      control: 'radio',
      options: ['peek', 'partial', 'full'],
      description: 'Vertical detent height state of the directions sheet',
    },
  },
};

export default meta;
type Story = StoryObj<DirectionsPanelStoryArgs>;

export const DirectionsPanelStory: Story = {
  name: 'DirectionsPanel',
  args: {
    mode: 'interstellar-options',
    detent: 'partial',
  },
  render: (args) => {
    const journey = SCENARIOS[args.mode] ?? SCENARIOS['interstellar-options'];

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>DirectionsPanel</h1>
          <p className={storyStyles.description}>
            Interactive flight navigation sheet plotting delta-v, duration, and transit trajectories across propulsion tiers.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.mode} · {args.detent})
            </h2>
            <div className={storyStyles.panelContainer}>
              <DirectionsPanel
                journey={journey}
                activeDetent={args.detent}
              />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
