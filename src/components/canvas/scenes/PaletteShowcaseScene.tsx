import { useState, useEffect } from 'react';
import { Card } from '../../poc/surfaces/Card/Card';
import { Panel } from '../../poc/surfaces/Panel/Panel';
import { Well } from '../../poc/surfaces/Well/Well';
import { Button } from '../../interface/control/Button/Button';
import { Input } from '../../interface/control/Input/Input';
import { Toggle } from '../../interface/control/Toggle/Toggle';
import { Slider } from '../../interface/control/Slider/Slider';
import { Badge } from '../../interface/data/Badge/Badge';
import { Unit } from '../../interface/data/Unit/Unit';
import { ConfidencePip } from '../../interface/data/ConfidencePip/ConfidencePip';
import { Toast } from '../../poc/overlays/Toast/Toast';
import styles from './PaletteShowcaseScene.module.css';

const STEPS = ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'] as const;

export type PaletteScheme = 'celestial' | 'spectral' | 'viridis' | 'cygnus' | 'kepler';
export type ThemeMode = 'dark' | 'light';

export interface SwatchItem {
  role: string;
  preview: string;
  oklchDark: string;
  oklchLight: string;
  token: string;
  desc: string;
}

export interface SchemeDetails {
  id: PaletteScheme;
  name: string;
  tagline: string;
  undertoneDark: string;
  undertoneLight: string;
  focusAccent: SwatchItem;
  surfaces: SwatchItem[];
  statuses: SwatchItem[];
  typography: SwatchItem[];
  series: [string, string, string, string];
  hues: [string, string, string, string];
}

const SCHEMES: Record<PaletteScheme, SchemeDetails> = {
  celestial: {
    id: 'celestial',
    name: 'Option 1: Celestial Obsidian (Default)',
    tagline: 'Cold deep space indigo-slate void with high-energy Electric Ion Cobalt focus. Cryogenic focal plane array aesthetic.',
    undertoneDark: '255° Celestial Indigo-Slate (Cold, C=0.020)',
    undertoneLight: '255° Indigo Vellum (Crisp, C=0.008)',
    focusAccent: {
      role: 'Active / Focus Accent',
      preview: 'focus',
      oklchDark: 'oklch(65.0% 0.235 262)',
      oklchLight: 'oklch(50.0% 0.230 262)',
      token: '--state-focus',
      desc: 'Electric Ion Cobalt: High contrast control ring & active state',
    },
    surfaces: [
      { role: 'Canvas Floor', preview: 'canvas', oklchDark: 'oklch(6.5% 0.020 255)', oklchLight: 'oklch(96.5% 0.008 255)', token: '--surface-canvas-bg', desc: 'Deep cosmic abyss viewport' },
      { role: 'Sunken Well', preview: 'inset', oklchDark: 'oklch(10.5% 0.026 255)', oklchLight: 'oklch(92.5% 0.012 255)', token: '--surface-inset-bg', desc: 'Carved tabular well & groove' },
      { role: 'Chassis Frame', preview: 'chassis', oklchDark: 'oklch(16.0%..12.5% 255)', oklchLight: 'oklch(95.5%..92.5% 255)', token: '--surface-hud-bg', desc: 'Peripheral HUD & Dock frame' },
      { role: 'Task Slab', preview: 'slab', oklchDark: 'oklch(19.5%..16.0% 255)', oklchLight: 'oklch(98.8%..95.0% 255)', token: '--surface-panel-bg', desc: 'Elevated panel & drawer slab' },
      { role: 'Overlay Glass', preview: 'overlay', oklchDark: 'oklch(22.5%..17.5% 255)', oklchLight: 'oklch(100%..96.0% 255)', token: '--surface-modal-bg', desc: 'Floating modal, toast & popover' },
    ],
    statuses: [
      { role: 'Nominal Baseline', preview: 'nominal', oklchDark: 'oklch(70.0% 0.055 255)', oklchLight: 'oklch(48.0% 0.050 255)', token: '--status-nominal', desc: 'Baseline neutral operational lock (zero false-alarm green)' },
      { role: 'Caution Alert', preview: 'caution', oklchDark: 'oklch(72.0% 0.160 78)', oklchLight: 'oklch(54.0% 0.160 78)', token: '--status-caution', desc: 'Solar Flare Amber: Anomaly alert' },
      { role: 'Critical Alarm', preview: 'critical', oklchDark: 'oklch(60.0% 0.220 28)', oklchLight: 'oklch(48.0% 0.210 28)', token: '--status-critical', desc: 'Ruby Coral Warning: Fault alarm' },
      { role: 'Advisory Info', preview: 'info', oklchDark: 'oklch(66.0% 0.150 230)', oklchLight: 'oklch(48.0% 0.150 230)', token: '--status-info', desc: 'Ion Blue Guidance: System notice' },
    ],
    typography: [
      { role: 'Prominent Text', preview: 'text-prominent', oklchDark: 'oklch(95.0% 0.010 255)', oklchLight: 'oklch(18.0% 0.025 255)', token: '--content-prominent', desc: 'Titles & primary metrics (AAA)' },
      { role: 'Default Body', preview: 'text-default', oklchDark: 'oklch(82.0% 0.015 255)', oklchLight: 'oklch(30.0% 0.025 255)', token: '--content-default', desc: 'Standard copy & labels (AAA)' },
      { role: 'Muted Data', preview: 'text-muted', oklchDark: 'oklch(64.0% 0.020 255)', oklchLight: 'oklch(50.0% 0.020 255)', token: '--content-muted', desc: 'Units & secondary meta (AA)' },
      { role: 'Faint Markings', preview: 'text-faint', oklchDark: 'oklch(48.0% 0.025 255)', oklchLight: 'oklch(68.0% 0.015 255)', token: '--content-faint', desc: 'Reticles & placeholders' },
    ],
    series: ['Azure (Ion Velocity)', 'Amber (Solar Flare)', 'Emerald (Flora / Orbit)', 'Violet (Nebula Mass)'],
    hues: ['220° Cyan-Blue', '75° Gold', '145° Emerald', '305° Purple'],
  },
  spectral: {
    id: 'spectral',
    name: 'Option 2: Stellar Basalt',
    tagline: 'Warm basalt-charcoal foundation with Solar Corona Gold focus. Grounded in stellar emission physics and canonical Solarized warmth.',
    undertoneDark: '72° Basalt Bronze (Warm, C=0.016)',
    undertoneLight: '85° Limestone Vellum (Warm, C=0.016)',
    focusAccent: {
      role: 'Active / Focus Accent',
      preview: 'focus',
      oklchDark: 'oklch(76.0% 0.178 78)',
      oklchLight: 'oklch(48.0% 0.170 65)',
      token: '--state-focus',
      desc: 'Solar Corona Gold: High-visibility stellar flare / bronze cue',
    },
    surfaces: [
      { role: 'Canvas Floor', preview: 'canvas', oklchDark: 'oklch(7.2% 0.016 72)', oklchLight: 'oklch(96.8% 0.016 85)', token: '--surface-canvas-bg', desc: 'Warm basalt void floor' },
      { role: 'Sunken Well', preview: 'inset', oklchDark: 'oklch(11.0% 0.022 72)', oklchLight: 'oklch(92.0% 0.020 85)', token: '--surface-inset-bg', desc: 'Sunken bronze trench' },
      { role: 'Chassis Frame', preview: 'chassis', oklchDark: 'oklch(16.5%..13.0% 72)', oklchLight: 'oklch(95.0%..92.0% 85)', token: '--surface-hud-bg', desc: 'Dark bronze chassis frame' },
      { role: 'Task Slab', preview: 'slab', oklchDark: 'oklch(19.8%..16.2% 72)', oklchLight: 'oklch(98.8%..95.0% 85)', token: '--surface-panel-bg', desc: 'Warm titanium slab surface' },
      { role: 'Overlay Glass', preview: 'overlay', oklchDark: 'oklch(23.2%..18.0% 72)', oklchLight: 'oklch(99.6%..95.8% 85)', token: '--surface-modal-bg', desc: 'Smoked amber-tinted overlay' },
    ],
    statuses: [
      { role: 'Nominal Baseline', preview: 'nominal', oklchDark: 'oklch(68.0% 0.050 72)', oklchLight: 'oklch(46.0% 0.045 72)', token: '--status-nominal', desc: 'Warm Quartz Baseline (zero false-alarm green)' },
      { role: 'Caution Alert', preview: 'caution', oklchDark: 'oklch(73.0% 0.165 82)', oklchLight: 'oklch(52.0% 0.165 82)', token: '--status-caution', desc: 'Solar Flare Amber: Anomaly alert' },
      { role: 'Critical Alarm', preview: 'critical', oklchDark: 'oklch(59.0% 0.215 32)', oklchLight: 'oklch(46.0% 0.205 32)', token: '--status-critical', desc: 'Magma Crimson Warning: Fault alarm' },
      { role: 'Advisory Info', preview: 'info', oklchDark: 'oklch(64.0% 0.145 225)', oklchLight: 'oklch(46.0% 0.145 225)', token: '--status-info', desc: 'Stellar Cyan Guidance: System notice' },
    ],
    typography: [
      { role: 'Prominent Text', preview: 'text-prominent', oklchDark: 'oklch(94.5% 0.015 85)', oklchLight: 'oklch(18.0% 0.025 65)', token: '--content-prominent', desc: 'Warm ivory titles (AAA)' },
      { role: 'Default Body', preview: 'text-default', oklchDark: 'oklch(82.0% 0.020 85)', oklchLight: 'oklch(30.0% 0.025 65)', token: '--content-default', desc: 'Sandstone chalk body (AAA)' },
      { role: 'Muted Data', preview: 'text-muted', oklchDark: 'oklch(64.0% 0.022 75)', oklchLight: 'oklch(50.0% 0.020 70)', token: '--content-muted', desc: 'Warm bronze telemetry (AA)' },
      { role: 'Faint Markings', preview: 'text-faint', oklchDark: 'oklch(48.0% 0.025 72)', oklchLight: 'oklch(68.0% 0.015 80)', token: '--content-faint', desc: 'Basalt grid reticles' },
    ],
    series: ['Doppler Cyan (Blueshift)', 'Stellar Gold (G2V Corona)', 'H-Alpha Ruby (Emission)', 'Lyman Ultraviolet (Far UV)'],
    hues: ['195° Cyan', '85° Solar Gold', '25° Ruby', '280° Far UV'],
  },
  viridis: {
    id: 'viridis',
    name: 'Option 3: Achromatic Carbon',
    tagline: 'Surgical achromatic carbon graphite with Precision Laser Cyan focus. Aerospace instrument & OLED laboratory aesthetic.',
    undertoneDark: 'Achromatic Carbon (C=0.000, Pure Neutral)',
    undertoneLight: 'Achromatic Vellum (C=0.000, Pure Neutral)',
    focusAccent: {
      role: 'Active / Focus Accent',
      preview: 'focus',
      oklchDark: 'oklch(78.0% 0.172 195)',
      oklchLight: 'oklch(44.0% 0.160 195)',
      token: '--state-focus',
      desc: 'Precision Laser Cyan: High luminescence 488nm interferometry cue',
    },
    surfaces: [
      { role: 'Canvas Floor', preview: 'canvas', oklchDark: 'oklch(5.5% 0.000 0)', oklchLight: 'oklch(97.0% 0.000 0)', token: '--surface-canvas-bg', desc: 'OLED pure void floor' },
      { role: 'Sunken Well', preview: 'inset', oklchDark: 'oklch(9.5% 0.000 0)', oklchLight: 'oklch(92.0% 0.000 0)', token: '--surface-inset-bg', desc: 'Precision carved carbon well' },
      { role: 'Chassis Frame', preview: 'chassis', oklchDark: 'oklch(14.5%..11.0% 0)', oklchLight: 'oklch(94.0%..91.0% 0)', token: '--surface-hud-bg', desc: 'Anodized chassis frame' },
      { role: 'Task Slab', preview: 'slab', oklchDark: 'oklch(18.0%..14.5% 0)', oklchLight: 'oklch(99.0%..95.0% 0)', token: '--surface-panel-bg', desc: 'Matte graphite task slab' },
      { role: 'Overlay Glass', preview: 'overlay', oklchDark: 'oklch(21.5%..16.5% 0)', oklchLight: 'oklch(100%..96.0% 0)', token: '--surface-modal-bg', desc: 'Achromatic smoked glass' },
    ],
    statuses: [
      { role: 'Nominal Baseline', preview: 'nominal', oklchDark: 'oklch(70.0% 0.000 0)', oklchLight: 'oklch(45.0% 0.000 0)', token: '--status-nominal', desc: 'Monochrome Silver Baseline (zero false-alarm green)' },
      { role: 'Caution Alert', preview: 'caution', oklchDark: 'oklch(74.0% 0.160 88)', oklchLight: 'oklch(52.0% 0.160 88)', token: '--status-caution', desc: 'Signal Amber Caution: Anomaly alert' },
      { role: 'Critical Alarm', preview: 'critical', oklchDark: 'oklch(60.0% 0.225 25)', oklchLight: 'oklch(46.0% 0.215 25)', token: '--status-critical', desc: 'Signal Crimson Warning: Fault alarm' },
      { role: 'Advisory Info', preview: 'info', oklchDark: 'oklch(64.0% 0.155 240)', oklchLight: 'oklch(46.0% 0.155 240)', token: '--status-info', desc: 'Signal Blue Guidance: System notice' },
    ],
    typography: [
      { role: 'Prominent Text', preview: 'text-prominent', oklchDark: 'oklch(96.0% 0.000 0)', oklchLight: 'oklch(15.0% 0.000 0)', token: '--content-prominent', desc: 'Pure surgical white (AAA)' },
      { role: 'Default Body', preview: 'text-default', oklchDark: 'oklch(82.0% 0.000 0)', oklchLight: 'oklch(28.0% 0.000 0)', token: '--content-default', desc: 'Carbon chalk body (AAA)' },
      { role: 'Muted Data', preview: 'text-muted', oklchDark: 'oklch(62.0% 0.000 0)', oklchLight: 'oklch(48.0% 0.000 0)', token: '--content-muted', desc: 'Medium carbon grey (AA)' },
      { role: 'Faint Markings', preview: 'text-faint', oklchDark: 'oklch(45.0% 0.000 0)', oklchLight: 'oklch(66.0% 0.000 0)', token: '--content-faint', desc: 'Surgical reticles' },
    ],
    series: ['Perceptual Teal (Low)', 'Spectral Lime (Mid-Low)', 'Solar Yellow (Mid-High)', 'Plasma Magenta (High)'],
    hues: ['185° Teal', '130° Lime', '95° Yellow', '340° Magenta'],
  },
  cygnus: {
    id: 'cygnus',
    name: 'Option 4: Deep Cygnus Navy',
    tagline: 'Rich oceanic midnight starfield with Pulsar Beacon Amber focus. Maritime celestial navigation aesthetic.',
    undertoneDark: '238° Marine Navy (Deep, C=0.040)',
    undertoneLight: '238° Cerulean Slate (Technical, C=0.012)',
    focusAccent: {
      role: 'Active / Focus Accent',
      preview: 'focus',
      oklchDark: 'oklch(74.0% 0.188 58)',
      oklchLight: 'oklch(48.0% 0.185 52)',
      token: '--state-focus',
      desc: 'Pulsar Beacon Amber: Direct complementary pop against midnight navy',
    },
    surfaces: [
      { role: 'Canvas Floor', preview: 'canvas', oklchDark: 'oklch(6.8% 0.040 238)', oklchLight: 'oklch(96.5% 0.012 238)', token: '--surface-canvas-bg', desc: 'Deep oceanic void floor' },
      { role: 'Sunken Well', preview: 'inset', oklchDark: 'oklch(10.5% 0.045 238)', oklchLight: 'oklch(92.0% 0.018 238)', token: '--surface-inset-bg', desc: 'Abyssal trench well' },
      { role: 'Chassis Frame', preview: 'chassis', oklchDark: 'oklch(15.5%..12.0% 238)', oklchLight: 'oklch(94.2%..91.2% 238)', token: '--surface-hud-bg', desc: 'Midnight navy chassis frame' },
      { role: 'Task Slab', preview: 'slab', oklchDark: 'oklch(19.2%..15.6% 238)', oklchLight: 'oklch(98.6%..94.8% 238)', token: '--surface-panel-bg', desc: 'Cerulean slate task slab' },
      { role: 'Overlay Glass', preview: 'overlay', oklchDark: 'oklch(22.8%..17.8% 238)', oklchLight: 'oklch(99.6%..95.6% 238)', token: '--surface-modal-bg', desc: 'Smoked navy glass overlay' },
    ],
    statuses: [
      { role: 'Nominal Baseline', preview: 'nominal', oklchDark: 'oklch(68.0% 0.065 238)', oklchLight: 'oklch(46.0% 0.060 238)', token: '--status-nominal', desc: 'Maritime Navy Baseline (zero false-alarm green)' },
      { role: 'Caution Alert', preview: 'caution', oklchDark: 'oklch(73.0% 0.165 72)', oklchLight: 'oklch(52.0% 0.165 72)', token: '--status-caution', desc: 'Solar Flare Amber: Anomaly alert' },
      { role: 'Critical Alarm', preview: 'critical', oklchDark: 'oklch(59.0% 0.220 26)', oklchLight: 'oklch(46.0% 0.210 26)', token: '--status-critical', desc: 'Ruby Warning: Fault alarm' },
      { role: 'Advisory Info', preview: 'info', oklchDark: 'oklch(65.0% 0.150 210)', oklchLight: 'oklch(46.0% 0.150 210)', token: '--status-info', desc: 'Steel Blue Guidance: System notice' },
    ],
    typography: [
      { role: 'Prominent Text', preview: 'text-prominent', oklchDark: 'oklch(95.0% 0.015 238)', oklchLight: 'oklch(17.0% 0.035 238)', token: '--content-prominent', desc: 'Polar ice white (AAA)' },
      { role: 'Default Body', preview: 'text-default', oklchDark: 'oklch(82.0% 0.022 238)', oklchLight: 'oklch(29.0% 0.032 238)', token: '--content-default', desc: 'Cerulean white body (AAA)' },
      { role: 'Muted Data', preview: 'text-muted', oklchDark: 'oklch(64.0% 0.030 238)', oklchLight: 'oklch(49.0% 0.025 238)', token: '--content-muted', desc: 'Navy slate telemetry (AA)' },
      { role: 'Faint Markings', preview: 'text-faint', oklchDark: 'oklch(48.0% 0.035 238)', oklchLight: 'oklch(67.0% 0.020 238)', token: '--content-faint', desc: 'Trench reticles' },
    ],
    series: ['Oceanic Cerulean (Velocity)', 'Lighthouse Amber (Flux)', 'Algal Phosphor (Orbit)', 'Abyssal Deep Orchid (UV)'],
    hues: ['225° Cerulean', '65° Amber', '140° Phosphor', '310° Orchid'],
  },
  kepler: {
    id: 'kepler',
    name: 'Option 5: Kepler Spectral',
    tagline: 'Spaceborne photometer optics with Neodymium Emerald / [O III] Spectral Teal focus. Clinical astrophysical laboratory aesthetic.',
    undertoneDark: '198° Titanium Slate (Clinical, C=0.022)',
    undertoneLight: '198° Titanium Vellum (Clean, C=0.010)',
    focusAccent: {
      role: 'Active / Focus Accent',
      preview: 'focus',
      oklchDark: 'oklch(75.0% 0.190 156)',
      oklchLight: 'oklch(45.0% 0.175 156)',
      token: '--state-focus',
      desc: 'Neodymium Emerald / [O III] Spectral Teal: 500.7nm forbidden line emission',
    },
    surfaces: [
      { role: 'Canvas Floor', preview: 'canvas', oklchDark: 'oklch(6.8% 0.022 198)', oklchLight: 'oklch(96.8% 0.010 198)', token: '--surface-canvas-bg', desc: 'Titanium vacuum floor' },
      { role: 'Sunken Well', preview: 'inset', oklchDark: 'oklch(10.6% 0.028 198)', oklchLight: 'oklch(92.4% 0.014 198)', token: '--surface-inset-bg', desc: 'Milled gauge housing' },
      { role: 'Chassis Frame', preview: 'chassis', oklchDark: 'oklch(15.4%..12.0% 198)', oklchLight: 'oklch(94.4%..91.5% 198)', token: '--surface-hud-bg', desc: 'Aerospace instrument frame' },
      { role: 'Task Slab', preview: 'slab', oklchDark: 'oklch(19.2%..15.6% 198)', oklchLight: 'oklch(98.6%..94.8% 198)', token: '--surface-panel-bg', desc: 'Titanium task slab' },
      { role: 'Overlay Glass', preview: 'overlay', oklchDark: 'oklch(22.6%..17.6% 198)', oklchLight: 'oklch(99.6%..95.6% 198)', token: '--surface-modal-bg', desc: 'Translucent photometer glass' },
    ],
    statuses: [
      { role: 'Nominal Baseline', preview: 'nominal', oklchDark: 'oklch(68.0% 0.050 198)', oklchLight: 'oklch(46.0% 0.045 198)', token: '--status-nominal', desc: 'Titanium Baseline (zero false-alarm green)' },
      { role: 'Caution Alert', preview: 'caution', oklchDark: 'oklch(74.0% 0.160 85)', oklchLight: 'oklch(52.0% 0.160 85)', token: '--status-caution', desc: 'Solar Gold Caution: Anomaly alert' },
      { role: 'Critical Alarm', preview: 'critical', oklchDark: 'oklch(60.0% 0.220 26)', oklchLight: 'oklch(46.0% 0.210 26)', token: '--status-critical', desc: 'Ruby Alert: Fault alarm' },
      { role: 'Advisory Info', preview: 'info', oklchDark: 'oklch(65.0% 0.150 235)', oklchLight: 'oklch(46.0% 0.150 235)', token: '--status-info', desc: 'Deep Cyan Guidance: System notice' },
    ],
    typography: [
      { role: 'Prominent Text', preview: 'text-prominent', oklchDark: 'oklch(95.0% 0.010 198)', oklchLight: 'oklch(17.5% 0.028 198)', token: '--content-prominent', desc: 'Titanium white (AAA)' },
      { role: 'Default Body', preview: 'text-default', oklchDark: 'oklch(82.0% 0.018 198)', oklchLight: 'oklch(29.5% 0.026 198)', token: '--content-default', desc: 'Opal slate body (AAA)' },
      { role: 'Muted Data', preview: 'text-muted', oklchDark: 'oklch(64.0% 0.024 198)', oklchLight: 'oklch(49.5% 0.022 198)', token: '--content-muted', desc: 'Aero slate telemetry (AA)' },
      { role: 'Faint Markings', preview: 'text-faint', oklchDark: 'oklch(48.0% 0.028 198)', oklchLight: 'oklch(67.5% 0.018 198)', token: '--content-faint', desc: 'Titanium reticles' },
    ],
    series: ['Doppler Blue (Blueshift)', 'Continuum Solar Gold (Flux)', '[O III] Spectral Teal (Orbit)', 'Lyman-Limit UV (Magnetic)'],
    hues: ['220° Doppler Blue', '80° Solar Gold', '160° [O III] Teal', '300° Lyman UV'],
  },
};

interface ConfidenceMetric {
  label: string;
  sublabel: string;
  value: string;
  unit: string;
  confidence: 'confirmed' | 'candidate' | 'theoretical';
  certainty: string;
}

const CONFIDENCE_DATA: ConfidenceMetric[] = [
  { label: 'Semi-Major Axis', sublabel: 'Keplerian orbital radius', value: '1.024', unit: 'AU', confidence: 'confirmed', certainty: '≥ 5σ Verified' },
  { label: 'Transit Depth', sublabel: 'Photometric occultation flux', value: '842', unit: 'ppm', confidence: 'confirmed', certainty: 'Matched LC' },
  { label: 'Radial Velocity', sublabel: 'Doppler wobble semi-amplitude', value: '35.6', unit: 'km/s', confidence: 'confirmed', certainty: 'HARPS Spec' },
  { label: 'Planetary Radius', sublabel: 'Derived from chord transit', value: '1.38', unit: 'R⊕', confidence: 'candidate', certainty: '2.4σ Fit' },
  { label: 'Equilibrium Temp', sublabel: 'Bolometric radiation balance', value: '288.2', unit: 'K', confidence: 'candidate', certainty: 'Awaiting NIR' },
  { label: 'Surface Gravity', sublabel: 'Inferred gravitational field', value: '9.81', unit: 'm/s²', confidence: 'candidate', certainty: 'Estimated' },
  { label: 'Core Mass Fraction', sublabel: 'Hydrostatic interior model', value: '0.325', unit: 'M_core', confidence: 'theoretical', certainty: 'EOS Model' },
  { label: 'Atmosphere Height', sublabel: 'Exo-atmospheric scale height', value: '8.4', unit: 'km', confidence: 'theoretical', certainty: 'Synthetic' },
];

export const PaletteShowcaseScene = () => {
  const [activeScheme, setActiveScheme] = useState<PaletteScheme>('celestial');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [glowActive, setGlowActive] = useState(true);
  const [toggleChecked, setToggleChecked] = useState(true);
  const [sliderVal, setSliderVal] = useState(65);
  const [inputValue, setInputValue] = useState('HD 10180 (G1V Stellar Host)');

  const currentScheme = SCHEMES[activeScheme];

  // Synchronize scheme and theme to document.body and document.documentElement so the whole page background matches the canvas
  useEffect(() => {
    document.documentElement.setAttribute('data-scheme', activeScheme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-scheme', activeScheme);
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.documentElement.removeAttribute('data-scheme');
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-scheme');
      document.body.removeAttribute('data-theme');
    };
  }, [activeScheme, theme]);

  return (
    <div
      className={styles.container}
      data-scheme={activeScheme}
      data-theme={theme}
      data-glow={glowActive ? 'true' : 'false'}
      data-testid="palette-showcase-scene"
    >
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Visual Language Whole-UI Palette & Token System</h1>
        <p className={styles.description}>
          Every option transforms the <strong>entire UI</strong>: physical surface hierarchy, sunken well depth,
          chassis frames, active focus state, telemetry status system, typography contrast tiers, and 10-step data viz ramps.
          The page background seamlessly synchronizes with the selected canvas floor for accurate spatial depth evaluation.
        </p>
      </header>

      {/* Scheme & Theme Selector Bar */}
      <div className={styles.schemeBar}>
        <div className={styles.schemeButtonGroup}>
          <span className={styles.captionMuted}>Palette Scheme:</span>
          {(['celestial', 'spectral', 'viridis', 'cygnus', 'kepler'] as const).map((schemeKey) => (
            <Button
              key={schemeKey}
              variant={activeScheme === schemeKey ? 'primary' : 'subtle'}
              size="sm"
              onClick={() => setActiveScheme(schemeKey)}
            >
              {SCHEMES[schemeKey].name.split(':')[1]?.trim() || SCHEMES[schemeKey].name}
            </Button>
          ))}
        </div>

        <div className={styles.modeButtonGroup}>
          <span className={styles.captionMuted}>Theme Mode:</span>
          <Button
            variant={theme === 'dark' ? 'primary' : 'subtle'}
            size="sm"
            onClick={() => setTheme('dark')}
          >
            Dark Mode
          </Button>
          <Button
            variant={theme === 'light' ? 'primary' : 'subtle'}
            size="sm"
            onClick={() => setTheme('light')}
          >
            Light Mode
          </Button>
        </div>
      </div>

      {/* 1. Complete UI Color Swatch Matrix */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          1. Whole-UI Color Swatch Matrix ({currentScheme.name.split(':')[1]?.trim()} • {theme.toUpperCase()} MODE)
        </h2>
        <p className={styles.sectionDesc}>
          Live swatches across all functional semantic layers: Surfaces, Focus Accent, Status System, and Content Hierarchy.
          Undertone: <strong>{theme === 'dark' ? currentScheme.undertoneDark : currentScheme.undertoneLight}</strong>.
        </p>

        {/* Surface Hierarchy Swatches */}
        <div className={styles.rampContainer}>
          <div className={styles.rampHeader}>
            <span className={styles.rampName}>Physical Surface Lightness Ladder (5 Layers)</span>
            <span className={styles.captionMuted}>
              {theme === 'dark' ? 'Floor (L=5.5..7.2%) → Overlays (L=21.5..23.5%)' : 'Floor (L=96.5..97.0%) → Overlays (L=99.6..100%)'}
            </span>
          </div>
          <div className={styles.swatchGrid}>
            {currentScheme.surfaces.map((s) => (
              <div key={s.role} className={styles.swatchCard}>
                <div className={styles.swatchPreview} data-preview={s.preview} />
                <div className={styles.swatchInfo}>
                  <span className={styles.swatchTitle}>{s.role}</span>
                  <span className={styles.swatchValue}>{theme === 'dark' ? s.oklchDark : s.oklchLight}</span>
                  <span className={styles.swatchToken}>{s.token}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Focus Accent & Status System Swatches */}
        <div className={styles.rampContainer}>
          <div className={styles.rampHeader}>
            <span className={styles.rampName}>Interactive Focus & Telemetry Status System</span>
            <span className={styles.captionMuted}>Control ring + Operational status (Nominal is calibrated baseline neutral)</span>
          </div>
          <div className={styles.swatchGrid}>
            <div className={styles.swatchCard}>
              <div className={styles.swatchPreview} data-preview={currentScheme.focusAccent.preview} />
              <div className={styles.swatchInfo}>
                <span className={styles.swatchTitle}>{currentScheme.focusAccent.role}</span>
                <span className={styles.swatchValue}>
                  {theme === 'dark' ? currentScheme.focusAccent.oklchDark : currentScheme.focusAccent.oklchLight}
                </span>
                <span className={styles.swatchToken}>{currentScheme.focusAccent.token}</span>
              </div>
            </div>
            {currentScheme.statuses.map((st) => (
              <div key={st.role} className={styles.swatchCard}>
                <div className={styles.swatchPreview} data-preview={st.preview} />
                <div className={styles.swatchInfo}>
                  <span className={styles.swatchTitle}>{st.role}</span>
                  <span className={styles.swatchValue}>{theme === 'dark' ? st.oklchDark : st.oklchLight}</span>
                  <span className={styles.swatchToken}>{st.token}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content & Typography Tiers */}
        <div className={styles.rampContainer}>
          <div className={styles.rampHeader}>
            <span className={styles.rampName}>Content & Typography Contrast Tiers</span>
            <span className={styles.captionMuted}>Perceptually uniform text luminance across dark and light modes</span>
          </div>
          <div className={styles.swatchGrid}>
            {currentScheme.typography.map((t) => (
              <div key={t.role} className={styles.swatchCard}>
                <div className={styles.swatchPreview} data-preview={t.preview} />
                <div className={styles.swatchInfo}>
                  <span className={styles.swatchTitle}>{t.role}</span>
                  <span className={styles.swatchValue}>{theme === 'dark' ? t.oklchDark : t.oklchLight}</span>
                  <span className={styles.swatchToken}>{t.token}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Physical Lightness & Spatial Depth Hierarchy */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Spatial Depth Hierarchy (Canvas Floor, Sunken Well & Lifted Slabs)</h2>
        <p className={styles.sectionDesc}>
          Calibrated lightness hierarchy in OKLCH: Canvas floor background, sunken well, chassis frame,
          lifted task slab, and floating overlays. In both Dark and Light modes, the panels and wells achieve
          unmistakable tactile separation from the page canvas with zero bleeding.
        </p>
        <div className={styles.depthVisualizer}>
          <div className={styles.depthLabel}>
            <span>Active Canvas Viewport Floor: {theme === 'dark' ? currentScheme.surfaces[0].oklchDark : currentScheme.surfaces[0].oklchLight}</span>
            <span>Cosmic Background Environment</span>
          </div>
          <div className={styles.grid}>
            {/* Panel Slab with Nested Sunken Well */}
            <Panel
              header={
                <div className={styles.cardHeaderRow}>
                  <span>Telemetry Task Slab (Panel)</span>
                  <span className={styles.captionMuted}>
                    {theme === 'dark' ? 'L = 19.5% → 16.0%' : 'L = 98.8% → 95.0%'}
                  </span>
                </div>
              }
            >
              <div className={styles.panelContentStack}>
                <p className={styles.cardBodyText}>
                  Elevated task surface with 137° directional falloff and specular micro-bevel. Notice the clean contrast separation against the floor below,
                  and how the sunken well recedes without artificial concentric borders.
                </p>
                {/* Sunken Inset Well */}
                <Well tabular padding="default">
                  <div className={styles.wellHeaderRow}>
                    <span className={styles.wellTitle}>Sunken Well ({theme === 'dark' ? currentScheme.surfaces[1].oklchDark : currentScheme.surfaces[1].oklchLight})</span>
                    <span className={styles.captionMuted}>Depth: ΔL = {theme === 'dark' ? '+6.0%..9.5%' : '-5.5%..-7.0%'}</span>
                  </div>
                  <div className={styles.wellMetricsGrid}>
                    <div className={styles.wellMetricItem}>
                      <span className={styles.wellMetricLabel}>RA (J2000)</span>
                      <span className={styles.wellMetricValue}>01h 37m 54.1s</span>
                    </div>
                    <div className={styles.wellMetricItem}>
                      <span className={styles.wellMetricLabel}>Dec</span>
                      <span className={styles.wellMetricValue}>-60° 30′ 42″</span>
                    </div>
                    <div className={styles.wellMetricItem}>
                      <span className={styles.wellMetricLabel}>Radial Vel</span>
                      <span className={styles.wellMetricValue}>+35.6 km/s</span>
                    </div>
                    <div className={styles.wellMetricItem}>
                      <span className={styles.wellMetricLabel}>Parallax</span>
                      <span className={styles.wellMetricValue}>25.42 mas</span>
                    </div>
                  </div>
                </Well>
              </div>
            </Panel>

            {/* Nominal Status Slab with Buffer Well */}
            <Card status="nominal">
              <div className={styles.cardHeaderRow}>
                <h3 className={styles.cardHeading}>Nominal Baseline Slab</h3>
                <span className={styles.captionMuted}>Baseline Standby</span>
              </div>
              <div className={styles.panelContentStack}>
                <p className={styles.cardBodyText}>
                  Subtle tinted neutral surface with matching 28% alpha boundary, top+left specular catch,
                  and calm baseline presence. Nominal is neutral — zero false-alarm green.
                </p>
                <Well tabular padding="tight">
                  <div className={styles.wellHeaderRow}>
                    <span className={styles.wellTitle}>Telemetry Baseline Buffer</span>
                    <span className={styles.captionMuted}>Active Epoch</span>
                  </div>
                  <div className={styles.wellMetricsGrid}>
                    <div className={styles.wellMetricItem}>
                      <span className={styles.wellMetricLabel}>Clock Drift</span>
                      <span className={styles.wellMetricValue}>&lt; 0.002 ps</span>
                    </div>
                    <div className={styles.wellMetricItem}>
                      <span className={styles.wellMetricLabel}>Noise Floor</span>
                      <span className={styles.wellMetricValue}>-142.4 dBm</span>
                    </div>
                  </div>
                </Well>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Mathematical Derivation Explanation */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Mathematical Derivation & Gamut Engineering</h2>
        <div className={styles.mathBox}>
          <div>
            <span className={styles.mathFormula}>1. Perceptual Lightness Linearisation:</span> In standard HSL or sRGB, pure yellow (hue 60°) is perceived as 10× brighter than pure blue (hue 240°) at 50% lightness. OKLCH (based on the CAM16 human visual model) isolates perceived lightness (L), chroma (C), and hue (H). Every color at L=56% has identical human-perceived luminance.
          </div>
          <div>
            <span className={styles.mathFormula}>2. Physical Layer Lightness Steps:</span> Dark Mode: Canvas Floor (L=5.5..7.2%) → Sunken Inset Well (L=9.5..11.0%, +3% step) → Chassis Frame (L=12.0..16.5%) → Task Slabs (L=15.5..19.8%, +6..9.5% step above well) → Overlays (L=17.0..23.5%). Light Mode: Floor (L=96.5..97.0%) → Sunken Well (L=92.0..92.5%) → Task Slabs (L=98.6..99.0%). This guarantees deep optical relief with zero boundary bleed.
          </div>
          <div>
            <span className={styles.mathFormula}>3. Separation of Status vs Confidence:</span> Telemetry Condition Status (Nominal, Caution, Critical, Info) communicates hardware operating state; Nominal is calibrated as calm baseline neutral so operational consoles do not shout green. Observational Confidence (Confirmed, Candidate, Theoretical) is dedicated exclusively to astronomical data veracity, rendered with precision glowing pips next to numeric values.
          </div>
          <div>
            <span className={styles.mathFormula}>4. Monotonic 7% Data Viz Progression:</span> Step N in all series follows L(N) = 28% + (N - 1) × 7%, ranging from 28% (step 10) to 91% (step 100). This guarantees monotonic contrast against both dark and light surfaces and ensures full accessibility in grayscale or colorblind vision.
          </div>
        </div>
      </section>

      {/* 4. Interactive Focus & Active States */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Interactive Focus & Active Controls</h2>
        <p className={styles.sectionDesc}>
          Primary interactive controls anchor to {currentScheme.focusAccent.desc.split(':')[0]} ({theme === 'dark' ? currentScheme.focusAccent.oklchDark : currentScheme.focusAccent.oklchLight}), providing high contrast
          against the canvas floor and distinctly separating UI controls from celestial categories (Planet Cyan, Star Orange).
        </p>
        <div className={styles.chartBox}>
          <div className={styles.stateRow}>
            <Button variant="primary">Prominent Button</Button>
            <Button variant="default">Secondary Button</Button>
            <Button variant="subtle">Subtle Action</Button>
            <Toggle
              checked={toggleChecked}
              onChange={setToggleChecked}
              label="Active Ion Thruster"
            />
          </div>
          <div className={styles.stateRow}>
            <div className={styles.inputCol}>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search catalog..."
              />
            </div>
            <div className={styles.inputCol}>
              <Slider
                value={sliderVal}
                min={0}
                max={100}
                onChange={setSliderVal}
                label={`Flux Aperture: ${sliderVal}%`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Status System (Nominal Baseline, Caution, Critical, Info) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Telemetry Status System (Nominal is Neutral)</h2>
        <p className={styles.sectionDesc}>
          Operational telemetry health conditions. Nominal is now the calibrated calm neutral baseline (zero false-alarm green),
          reserving chromatic urgency strictly for Caution (Amber), Critical (Crimson), and Guidance (Blue).
        </p>
        <div className={styles.grid}>
          <Card status="nominal">
            <div className={styles.cardHeaderRow}>
              <Badge status="nominal">Nominal</Badge>
              <span className={styles.captionMuted}>{theme === 'dark' ? currentScheme.statuses[0].oklchDark : currentScheme.statuses[0].oklchLight}</span>
            </div>
            <p className={styles.cardBodyText}>
              Standard baseline operation, normal telemetry cadence, confirmed lock. Calibrated neutral tone.
            </p>
          </Card>

          <Card status="caution">
            <div className={styles.cardHeaderRow}>
              <Badge status="caution">Caution</Badge>
              <span className={styles.captionMuted}>{theme === 'dark' ? currentScheme.statuses[1].oklchDark : currentScheme.statuses[1].oklchLight}</span>
            </div>
            <p className={styles.cardBodyText}>
              Subtle amber background with 28% amber perimeter and golden specular rim catch.
            </p>
          </Card>

          <Card status="critical">
            <div className={styles.cardHeaderRow}>
              <Badge status="critical">Critical</Badge>
              <span className={styles.captionMuted}>{theme === 'dark' ? currentScheme.statuses[2].oklchDark : currentScheme.statuses[2].oklchLight}</span>
            </div>
            <p className={styles.cardBodyText}>
              Deep crimson wash with 32% ruby border and directional specular rim catch.
            </p>
          </Card>

          <Card status="info">
            <div className={styles.cardHeaderRow}>
              <Badge status="info">Info</Badge>
              <span className={styles.captionMuted}>{theme === 'dark' ? currentScheme.statuses[3].oklchDark : currentScheme.statuses[3].oklchLight}</span>
            </div>
            <p className={styles.cardBodyText}>
              Advisory notices, ephemeris synchronization updates, non-alarm guidance.
            </p>
          </Card>
        </div>

        <div className={styles.toastRow}>
          <Toast
            status="caution"
            title="Telemetry Alert: Gravitational Perturbation"
            message="In-situ sensors observing 4.2 mas perturbation at (l=0.12°, b=-0.04°)."
          />
          <Toast
            status="nominal"
            title="Ephemeris Sync Nominal"
            message="All sensor packets aligned to TDB standard epoch J2000.0 without drift."
          />
        </div>
      </section>

      {/* 6. Active Palette Scheme: 10-Step Data Viz Ramps & Telemetry Treatment */}
      <section className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>6. {currentScheme.name} (Data Viz & Live Treatment)</h2>
          <p className={styles.sectionDesc}>{currentScheme.tagline}</p>
        </div>

        {/* Live Multi-Series Telemetry Treatment Widget */}
        <div className={styles.treatmentWidget}>
          <div className={styles.treatmentWidgetHeader}>
            <div className={styles.cardHeaderRow}>
              <h3 className={styles.cardHeading}>Spectral Energy Distribution ({currentScheme.name.split(':')[1]?.trim()})</h3>
            </div>
            <Badge status="nominal">Multi-Channel Telemetry</Badge>
          </div>
          <div className={styles.multiBarContainer}>
            <div className={styles.multiBar}>
              <div className={styles.multiBarSegment} data-segment="s1" title={currentScheme.series[0]} />
              <div className={styles.multiBarSegment} data-segment="s2" title={currentScheme.series[1]} />
              <div className={styles.multiBarSegment} data-segment="s3" title={currentScheme.series[2]} />
              <div className={styles.multiBarSegment} data-segment="s4" title={currentScheme.series[3]} />
            </div>
            <div className={styles.multiBarLegend}>
              {(['s1', 's2', 's3', 's4'] as const).map((segKey, idx) => (
                <div key={segKey} className={styles.legendItem}>
                  <div className={styles.legendDot} data-series={segKey} />
                  <span>{currentScheme.series[idx]} ({currentScheme.hues[idx]})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Series 1 */}
        <div className={styles.rampContainer}>
          <div className={styles.rampHeader}>
            <span className={styles.rampName}>Series 1: {currentScheme.series[0]}</span>
            <span className={styles.rampHue}>{currentScheme.hues[0]}</span>
          </div>
          <div className={styles.swatchTrack}>
            {STEPS.map((step) => (
              <div key={step} className={styles.swatch} data-series="azure" data-step={step}>
                <span className={styles.swatchStep}>{step}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Series 2 */}
        <div className={styles.rampContainer}>
          <div className={styles.rampHeader}>
            <span className={styles.rampName}>Series 2: {currentScheme.series[1]}</span>
            <span className={styles.rampHue}>{currentScheme.hues[1]}</span>
          </div>
          <div className={styles.swatchTrack}>
            {STEPS.map((step) => (
              <div key={step} className={styles.swatch} data-series="amber" data-step={step}>
                <span className={styles.swatchStep}>{step}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Series 3 */}
        <div className={styles.rampContainer}>
          <div className={styles.rampHeader}>
            <span className={styles.rampName}>Series 3: {currentScheme.series[2]}</span>
            <span className={styles.rampHue}>{currentScheme.hues[2]}</span>
          </div>
          <div className={styles.swatchTrack}>
            {STEPS.map((step) => (
              <div key={step} className={styles.swatch} data-series="emerald" data-step={step}>
                <span className={styles.swatchStep}>{step}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Series 4 */}
        <div className={styles.rampContainer}>
          <div className={styles.rampHeader}>
            <span className={styles.rampName}>Series 4: {currentScheme.series[3]}</span>
            <span className={styles.rampHue}>{currentScheme.hues[3]}</span>
          </div>
          <div className={styles.swatchTrack}>
            {STEPS.map((step) => (
              <div key={step} className={styles.swatch} data-series="violet" data-step={step}>
                <span className={styles.swatchStep}>{step}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Series Heatmap Comparison Chart */}
        <div className={styles.chartBox}>
          <div className={styles.chartHeaderRow}>
            <h3 className={styles.cardHeading}>
              Multi-Series Spectrogram Comparison ({currentScheme.name.split(':')[1]?.trim()})
            </h3>
            <span className={styles.captionMuted}>
              Monotonic lightness ensures equal visual weight across all series
            </span>
          </div>

          {(['azure', 'amber', 'emerald', 'violet'] as const).map((seriesKey, idx) => (
            <div key={seriesKey} className={styles.chartRow}>
              <span className={styles.chartSeriesLabel}>{currentScheme.series[idx].split(' ')[0].toUpperCase()}</span>
              {STEPS.map((step) => (
                <div
                  key={step}
                  className={`${styles.chartCell} ${styles.swatch}`}
                  data-series={seriesKey}
                  data-step={step}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 7. Observational Data Confidence System */}
      <section className={styles.confidenceSection}>
        <div className={styles.header}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.sectionTitle}>
              7. Observational Data Confidence System (Pips & Glow Optics)
            </h2>
            <div className={styles.confidenceBadgeGroup}>
              <Toggle
                checked={glowActive}
                onChange={setGlowActive}
                label="Luminescent Pip Glow"
              />
            </div>
          </div>
          <p className={styles.sectionDesc}>
            Scientific confidence indicates observational veracity directly adjacent to numeric telemetry.
            Numbers remain clean and achromatic; precision glowing pips communicate observational certainty:
            <strong> Confirmed</strong> (Emerald glow), <strong>Candidate</strong> (Solar amber glow), and <strong>Theoretical</strong> (Nebular violet glow).
          </p>
        </div>

        <div className={styles.confidenceGrid}>
          {/* Card A: Exoplanetary Transit Telemetry */}
          <div className={styles.confidenceCard}>
            <div className={styles.confidenceCardHeader}>
              <h3 className={styles.cardHeading}>Exoplanetary Orbit Telemetry</h3>
              <span className={styles.confidencePill} data-confidence="confirmed">
                <span className={styles.confidencePip} data-confidence="confirmed" />
                Transit Verified
              </span>
            </div>

            {CONFIDENCE_DATA.slice(0, 4).map((item) => (
              <div key={item.label} className={styles.confidenceMetricRow}>
                <div className={styles.confidenceLabelGroup}>
                  <span className={styles.confidenceLabel}>{item.label}</span>
                  <span className={styles.confidenceSublabel}>{item.sublabel}</span>
                </div>
                <div className={styles.confidenceValueGroup}>
                  <span className={styles.confidenceNumber}>{item.value}</span>
                  <Unit className={styles.confidenceUnit}>{item.unit}</Unit>
                  <ConfidencePip
                    confidence={item.confidence as any}
                    details={item.certainty}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Card B: Astrometric & Model Calculations */}
          <div className={styles.confidenceCard}>
            <div className={styles.confidenceCardHeader}>
              <h3 className={styles.cardHeading}>Stellar Host & Model Estimates</h3>
              <span className={styles.confidencePill} data-confidence="candidate">
                <span className={styles.confidencePip} data-confidence="candidate" />
                Candidate Model
              </span>
            </div>

            {CONFIDENCE_DATA.slice(4, 8).map((item) => (
              <div key={item.label} className={styles.confidenceMetricRow}>
                <div className={styles.confidenceLabelGroup}>
                  <span className={styles.confidenceLabel}>{item.label}</span>
                  <span className={styles.confidenceSublabel}>{item.sublabel}</span>
                </div>
                <div className={styles.confidenceValueGroup}>
                  <span className={styles.confidenceNumber}>{item.value}</span>
                  <Unit className={styles.confidenceUnit}>{item.unit}</Unit>
                  <ConfidencePip
                    confidence={item.confidence as any}
                    details={item.certainty}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
