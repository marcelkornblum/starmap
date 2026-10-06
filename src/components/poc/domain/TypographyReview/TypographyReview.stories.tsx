import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypographyReview } from './TypographyReview';

const meta: Meta<typeof TypographyReview> = {
  title: 'Domain/TypographyReview',
  component: TypographyReview,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Interactive typography laboratory and design system inspection workbench. Provides comprehensive controls for testing typeface pairings (Interface sans, Data mono, Editorial serif), modular scale ratios (1.125 to 1.414), base sizes, weights, leadings, trackings, and palette themes over realistic telemetry panels and data tables.',
      },
    },
  },
  argTypes: {
    interfaceFont: {
      control: 'select',
      options: ['inter', 'space-grotesk', 'outfit', 'plus-jakarta', 'system', 'mono'],
      description: 'Primary UI typography font family (--font-interface)',
    },
    dataFont: {
      control: 'select',
      options: ['jetbrains', 'fira-code', 'space-mono', 'system-mono'],
      description: 'Monospace telemetry and tabular figures font family (--font-data)',
    },
    copyFont: {
      control: 'select',
      options: ['newsreader', 'georgia', 'sans'],
      description: 'Editorial and classical cartographic copy font family (--font-copy)',
    },
    typeRatio: {
      control: 'select',
      options: ['major-second', 'minor-third', 'major-third', 'perfect-fourth', 'augmented-fourth'],
      description: 'Modular scale geometric progression ratio (--type-ratio)',
    },
    titleSize: {
      control: 'select',
      options: ['scale-1', 'scale-2', 'scale-3', 'scale-4'],
      description: 'Panel title typography size step',
    },
    titleWeight: {
      control: 'select',
      options: ['regular', 'medium', 'semibold', 'bold'],
      description: 'Panel title font weight',
    },
    subtitleSize: {
      control: 'select',
      options: ['scale-neg-1', 'scale-0', 'scale-1'],
      description: 'Panel subtitle typography size step',
    },
    subtitleCase: {
      control: 'inline-radio',
      options: ['none', 'uppercase'],
      description: 'Subtitle text transform',
    },
    subtitleTracking: {
      control: 'select',
      options: ['tight', 'normal', 'wide', 'wider', 'widest'],
      description: 'Subtitle letter tracking',
    },
    descriptionSize: {
      control: 'select',
      options: ['scale-neg-1', 'scale-0', 'scale-1'],
      description: 'Body description prose font size step',
    },
    descriptionLeading: {
      control: 'select',
      options: ['heading', 'body', 'prose'],
      description: 'Body prose line height (leading)',
    },
    tableDataSize: {
      control: 'select',
      options: ['scale-neg-3', 'scale-neg-2', 'scale-neg-1', 'scale-0'],
      description: 'Orbit data table numeric cell typography size',
    },
    tableHeaderSize: {
      control: 'select',
      options: ['scale-neg-3', 'scale-neg-2', 'scale-neg-1', 'scale-0'],
      description: 'Orbit data table column header typography size',
    },
    badgeStatus: {
      control: 'select',
      options: ['nominal', 'caution', 'critical', 'info', 'neutral'],
      description: 'Status badge telemetry condition',
    },
    palette: {
      control: 'select',
      options: ['carbon', 'kepler', 'cygnus', 'obsidian'],
      description: 'Semantic token palette theme override',
    },
    theme: {
      control: 'inline-radio',
      options: ['dark', 'light'],
      description: 'UI theme mode',
    },
    selectedOrbitId: {
      control: 'select',
      options: ['trappist-1e', 'proxima-b', 'earth', 'kepler-186f', 'jupiter'],
      description: 'Active highlighted row in data table',
    },
    titleText: {
      control: 'text',
      description: 'Panel header title text',
    },
    subtitleText: {
      control: 'text',
      description: 'Panel header subtitle text',
    },
    badgeText: {
      control: 'text',
      description: 'Panel badge label',
    },
    descriptionText: {
      control: 'text',
      description: 'Body description text',
    },
    showThemeSwitcher: {
      control: 'boolean',
      description: 'Show interactive theme switcher bar at the top',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TypographyReview>;

/**
 * Default Carbon Configuration
 * Achromatic dark graphite with Laser Cyan focus, Space Grotesk UI, and JetBrains Mono data.
 */
export const DefaultCarbon: Story = {
  args: {
    interfaceFont: 'space-grotesk',
    dataFont: 'jetbrains',
    copyFont: 'newsreader',
    typeRatio: 'major-third',
    titleSize: 'scale-2',
    titleWeight: 'semibold',
    subtitleSize: 'scale-0',
    subtitleCase: 'none',
    subtitleTracking: 'normal',
    descriptionSize: 'scale-0',
    descriptionLeading: 'prose',
    tableDataSize: 'scale-neg-1',
    tableHeaderSize: 'scale-neg-2',
    badgeStatus: 'nominal',
    palette: 'carbon',
    theme: 'dark',
    selectedOrbitId: 'earth',
    showThemeSwitcher: true,
  },
};

/**
 * Inter Precision Geometry
 * Inter sans pairing with Fira Code monospace on a compact Minor Third (1.200) ratio.
 */
export const InterPrecision: Story = {
  args: {
    ...DefaultCarbon.args,
    interfaceFont: 'inter',
    dataFont: 'fira-code',
    typeRatio: 'minor-third',
    titleSize: 'scale-2',
    titleWeight: 'bold',
    subtitleSize: 'scale-neg-1',
    subtitleCase: 'uppercase',
    subtitleTracking: 'wide',
    tableDataSize: 'scale-neg-1',
    badgeStatus: 'info',
    badgeText: 'PRECISION TELEMETRY',
  },
};

/**
 * SciFi Aerospace Telemetry
 * Space Grotesk paired with Space Mono on a high-contrast Perfect Fourth (1.333) ratio.
 */
export const SciFiTelemetry: Story = {
  args: {
    ...DefaultCarbon.args,
    interfaceFont: 'space-grotesk',
    dataFont: 'space-mono',
    typeRatio: 'perfect-fourth',
    titleSize: 'scale-3',
    titleWeight: 'bold',
    subtitleSize: 'scale-neg-1',
    subtitleCase: 'uppercase',
    subtitleTracking: 'wider',
    descriptionLeading: 'prose',
    badgeStatus: 'caution',
    badgeText: 'SPECTRAL ANOMALY',
  },
};

/**
 * Outfit Clean Contemporary
 * Outfit modern geometric sans paired with JetBrains Mono.
 */
export const OutfitModern: Story = {
  args: {
    ...DefaultCarbon.args,
    interfaceFont: 'outfit',
    dataFont: 'jetbrains',
    titleSize: 'scale-2',
    titleWeight: 'semibold',
    subtitleSize: 'scale-0',
    badgeStatus: 'nominal',
    badgeText: 'CONFIRMED CANDIDATE',
  },
};

/**
 * Light Mode Achromatic Carbon
 * High-contrast daylight cartographic survey view in Carbon theme.
 */
export const LightModeCarbon: Story = {
  args: {
    ...DefaultCarbon.args,
    theme: 'light',
    palette: 'carbon',
    interfaceFont: 'space-grotesk',
    dataFont: 'jetbrains',
    badgeStatus: 'nominal',
    badgeText: 'VERIFIED SURVEY',
  },
};

/**
 * All-Monospace Technical Console
 * Interface and data typography rendered completely in JetBrains Mono.
 */
export const AllMonospaceConsole: Story = {
  args: {
    ...DefaultCarbon.args,
    interfaceFont: 'mono',
    dataFont: 'jetbrains',
    typeRatio: 'minor-third',
    titleSize: 'scale-1',
    titleWeight: 'bold',
    subtitleCase: 'uppercase',
    subtitleTracking: 'widest',
    tableDataSize: 'scale-neg-1',
    badgeStatus: 'neutral',
    badgeText: 'CONSOLE LOCK',
  },
};
