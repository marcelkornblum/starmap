import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrbitTable, type OrbitElementRow } from './OrbitTable';

const sampleOrbits: OrbitElementRow[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    semiMajorAxis: 0.387,
    eccentricity: 0.2056,
    inclination: 7.0,
    periodDays: 87.97,
  },
  {
    id: 'venus',
    name: 'Venus',
    semiMajorAxis: 0.723,
    eccentricity: 0.0067,
    inclination: 3.39,
    periodDays: 224.7,
  },
  {
    id: 'earth',
    name: 'Earth',
    semiMajorAxis: 1.0,
    eccentricity: 0.0167,
    inclination: 0.0,
    periodDays: 365.25,
  },
  {
    id: 'mars',
    name: 'Mars',
    semiMajorAxis: 1.524,
    eccentricity: 0.0934,
    inclination: 1.85,
    periodDays: 686.98,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    semiMajorAxis: 5.204,
    eccentricity: 0.0489,
    inclination: 1.3,
    periodDays: 4332.59,
  },
];

const meta: Meta<typeof OrbitTable> = {
  title: 'POC/Domain/OrbitTable',
  component: OrbitTable,
};

export default meta;
type Story = StoryObj<typeof OrbitTable>;

export const Default: Story = {
  args: {
    orbits: sampleOrbits,
    selectedId: 'earth',
  },
};

export const Empty: Story = {
  args: {
    orbits: [],
  },
};
