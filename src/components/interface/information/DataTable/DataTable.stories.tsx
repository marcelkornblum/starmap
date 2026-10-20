import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTable } from './DataTable';
import { Badge } from '../Badge/Badge';
import { ConfidencePip } from '../ConfidencePip/ConfidencePip';
import { Stack } from '../../layouts/Stack/Stack';

import storyStyles from '../informationStories.module.css';

interface DataTableStoryArgs {
  caption: string;
  showConfidence: boolean;
  interactiveRows: boolean;
  selectedRowIndex: number;
}

const meta: Meta<DataTableStoryArgs> = {
  title: 'INTERFACE/Information',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    caption: {
      control: 'text',
      description: 'Table caption describing the catalog dataset',
    },
    showConfidence: {
      control: 'boolean',
      description: 'Display observational confidence indicators',
    },
    interactiveRows: {
      control: 'boolean',
      description: 'Enable hover and focus states on data rows',
    },
    selectedRowIndex: {
      control: 'select',
      options: [0, 1, 2, 3, -1],
      description: 'Index of the actively selected row (-1 for none)',
    },
  },
};

export default meta;
type Story = StoryObj<DataTableStoryArgs>;

const SAMPLE_EXOPLANETS = [
  {
    name: 'TRAPPIST-1e',
    spec: 'M4.0V',
    semiMajorAxis: '0.029',
    periodDays: '6.10',
    mass: '0.69',
    confidence: 'confirmed' as const,
    category: 'planet' as const,
  },
  {
    name: 'Proxima Centauri b',
    spec: 'M5.5V',
    semiMajorAxis: '0.048',
    periodDays: '11.19',
    mass: '1.07',
    confidence: 'confirmed' as const,
    category: 'planet' as const,
  },
  {
    name: 'Kepler-452b',
    spec: 'G2V',
    semiMajorAxis: '1.046',
    periodDays: '384.84',
    mass: '5.00',
    confidence: 'candidate' as const,
    category: 'planet' as const,
  },
  {
    name: 'Tau Ceti e',
    spec: 'G8.5V',
    semiMajorAxis: '0.538',
    periodDays: '162.87',
    mass: '3.93',
    confidence: 'candidate' as const,
    category: 'planet' as const,
  },
];

export const DataTableStory: Story = {
  name: 'DataTable',
  args: {
    caption: 'Habitable Candidate Exoplanet Ephemeris',
    showConfidence: true,
    interactiveRows: true,
    selectedRowIndex: 0,
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>DataTable</h1>
        <p className={storyStyles.description}>
          Accessible tabular presentation for astronomical telemetry, ephemerides, and catalog entries.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <DataTable caption={args.caption}>
            <DataTable.Head>
              <DataTable.Row>
                <DataTable.HeaderCell>Target</DataTable.HeaderCell>
                <DataTable.HeaderCell>Host Type</DataTable.HeaderCell>
                <DataTable.HeaderCell align="end" unit="AU">
                  Semi-Major Axis
                </DataTable.HeaderCell>
                <DataTable.HeaderCell align="end" unit="d">
                  Period
                </DataTable.HeaderCell>
                <DataTable.HeaderCell align="end" unit="M⊕">
                  Mass
                </DataTable.HeaderCell>
                {args.showConfidence && (
                  <DataTable.HeaderCell>Confidence</DataTable.HeaderCell>
                )}
              </DataTable.Row>
            </DataTable.Head>
            <DataTable.Body>
              {SAMPLE_EXOPLANETS.map((planet, idx) => (
                <DataTable.Row
                  key={planet.name}
                  interactive={args.interactiveRows}
                  selected={args.selectedRowIndex === idx}
                >
                  <DataTable.Cell>
                    <Badge category={planet.category}>{planet.name}</Badge>
                  </DataTable.Cell>
                  <DataTable.Cell>{planet.spec}</DataTable.Cell>
                  <DataTable.Cell numeric>{planet.semiMajorAxis}</DataTable.Cell>
                  <DataTable.Cell numeric>{planet.periodDays}</DataTable.Cell>
                  <DataTable.Cell numeric>{planet.mass}</DataTable.Cell>
                  {args.showConfidence && (
                    <DataTable.Cell>
                      <ConfidencePip confidence={planet.confidence} />
                    </DataTable.Cell>
                  )}
                </DataTable.Row>
              ))}
            </DataTable.Body>
          </DataTable>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive & Selected Row States</h2>
          <DataTable caption="Orbital Resonance Group">
            <DataTable.Head>
              <DataTable.Row>
                <DataTable.HeaderCell>Body</DataTable.HeaderCell>
                <DataTable.HeaderCell align="end" unit="km">
                  Radius
                </DataTable.HeaderCell>
                <DataTable.HeaderCell align="end" unit="d">
                  Orbital Period
                </DataTable.HeaderCell>
                <DataTable.HeaderCell>State</DataTable.HeaderCell>
              </DataTable.Row>
            </DataTable.Head>
            <DataTable.Body>
              <DataTable.Row interactive>
                <DataTable.Cell>Io</DataTable.Cell>
                <DataTable.Cell numeric>1,821.6</DataTable.Cell>
                <DataTable.Cell numeric>1.769</DataTable.Cell>
                <DataTable.Cell>
                  <Badge status="nominal">Interactive</Badge>
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row interactive selected>
                <DataTable.Cell>Europa</DataTable.Cell>
                <DataTable.Cell numeric>1,560.8</DataTable.Cell>
                <DataTable.Cell numeric>3.551</DataTable.Cell>
                <DataTable.Cell>
                  <Badge status="info">Selected</Badge>
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>Ganymede</DataTable.Cell>
                <DataTable.Cell numeric>2,634.1</DataTable.Cell>
                <DataTable.Cell numeric>7.155</DataTable.Cell>
                <DataTable.Cell>
                  <Badge status="neutral">Static</Badge>
                </DataTable.Cell>
              </DataTable.Row>
            </DataTable.Body>
          </DataTable>
        </section>
      </Stack>
    </div>
  ),
};
