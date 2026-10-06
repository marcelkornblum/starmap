import type { Meta, StoryObj } from '@storybook/react-vite';
import { StarDossier } from './StarDossier';

const solData = {
  id: 'sol',
  name: 'Sol',
  properName: 'Sun',
  spectralType: 'G2V',
  luminosityLsun: 1.0,
  massMsun: 1.0,
  radiusRsun: 1.0,
  effectiveTempK: 5778,
  distPc: 0.0,
  con: null,
  overviewText: 'Yellow dwarf star at the center of the Solar System, supporting 8 major planets and extensive debris belts.',
  planets: [
    {
      id: 'mercury',
      name: 'Mercury',
      letter: 'b',
      massMearth: 0.055,
      orbit: {
        semiMajorAxis: 0.387,
        eccentricity: 0.2056,
        inclination: 7.0,
        periodDays: 87.97,
        ascendingNode: 48.33,
        argumentOfPeriapsis: 29.12,
        meanAnomaly: 174.79,
      },
    },
    {
      id: 'earth',
      name: 'Earth',
      letter: 'd',
      massMearth: 1.0,
      orbit: {
        semiMajorAxis: 1.0,
        eccentricity: 0.0167,
        inclination: 0.0,
        periodDays: 365.25,
        ascendingNode: 0.0,
        argumentOfPeriapsis: 114.2,
        meanAnomaly: 358.6,
      },
    },
    {
      id: 'mars',
      name: 'Mars',
      letter: 'e',
      massMearth: 0.107,
      orbit: {
        semiMajorAxis: 1.524,
        eccentricity: 0.0934,
        inclination: 1.85,
        periodDays: 686.98,
        ascendingNode: 49.56,
        argumentOfPeriapsis: 286.5,
        meanAnomaly: 19.37,
      },
    },
  ],
};

const meta: Meta<typeof StarDossier> = {
  title: 'Domain/StarDossier',
  component: StarDossier,
};

export default meta;
type Story = StoryObj<typeof StarDossier>;

export const Default: Story = {
  args: {
    star: solData,
    onNavigateSystem: (id) => console.log('Navigate to', id),
    onSelectPlanet: (id) => console.log('Select planet', id),
    onClose: () => console.log('Close dossier'),
  },
};

export const WithoutPlanets: Story = {
  args: {
    star: {
      id: 'vega',
      name: 'Alpha Lyrae',
      properName: 'Vega',
      spectralType: 'A0V',
      luminosityLsun: 40.12,
      effectiveTempK: 9602,
      distPc: 7.68,
      con: 'Lyr',
      overviewText: 'Bright white main-sequence star in the northern constellation Lyra, with a prominent circumstellar dust disk.',
      planets: [],
    },
  },
};
