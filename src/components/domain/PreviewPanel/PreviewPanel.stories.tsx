import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FocusedPreviewSummary } from '../../../services/detailsService';
import { PreviewPanel } from './PreviewPanel';

const meta: Meta<typeof PreviewPanel> = {
  title: 'Domain/PreviewPanel',
  component: PreviewPanel,
};

export default meta;
type Story = StoryObj<typeof PreviewPanel>;

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

export const SystemPreview: Story = {
  args: {
    preview: systemPreviewFixture,
  },
};

export const StarPreview: Story = {
  args: {
    preview: starPreviewFixture,
  },
};

export const PlanetPreview: Story = {
  args: {
    preview: planetPreviewFixture,
  },
};

export const MinorBodyPreview: Story = {
  args: {
    preview: minorBodyPreviewFixture,
  },
};

export const StructurePreview: Story = {
  args: {
    preview: structurePreviewFixture,
  },
};
