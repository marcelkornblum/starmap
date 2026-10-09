import type { Meta, StoryObj } from '@storybook/react-vite';
import styles from './Elevations.module.css';

const meta: Meta = {
  title: 'INTERFACE/Surfaces',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

interface SurfaceTierDefinition {
  id: string;
  tierNumber: string;
  name: string;
  role: string;
  surfaceToken: string;
  borderToken: string;
  shadowToken: string;
  blurToken?: string;
  zIndex: string;
  explanation: string;
}

const SURFACE_TIERS: SurfaceTierDefinition[] = [
  {
    id: 'inset',
    tierNumber: 'Nested',
    name: 'Well / Inset',
    role: 'Recessed telemetry data displays, sunken wells, input floors',
    surfaceToken: '--surface-inset-bg',
    borderToken: '--surface-inset-border-color',
    shadowToken: '--surface-inset-shadow (inner shadow)',
    zIndex: 'In-tree (negative optical relief)',
    explanation:
      'Nested within higher surfaces with negative optical relief. Uses an inner bevel shadow and lowered luminance to visually sink numeric readings into the parent chassis.',
  },
  {
    id: 'canvas',
    tierNumber: 'Tier 0',
    name: 'Canvas Floor',
    role: '3D WebGL cartography canvas floor (parsec, AU, km frames)',
    surfaceToken: '--surface-canvas-bg',
    borderToken: 'none (boundary-less)',
    shadowToken: '--elevation-0',
    zIndex: 'var(--z-canvas) (0)',
    explanation:
      'The foundational planar floor of Starmap. Renders all 3D astronomical objects, coordinate fins, Keplerian orbits, and celestial reticles without DOM borders.',
  },
  {
    id: 'hud',
    tierNumber: 'Tier 1',
    name: 'HUD (Heads-Up Display)',
    role: 'Pinned reticles, camera bearing cues, corner tools, and scale tags',
    surfaceToken: '--surface-hud-bg',
    borderToken: '--surface-hud-border-color',
    shadowToken: '--surface-hud-shadow',
    zIndex: 'var(--z-hud) (100)',
    explanation:
      'Transparent overlay directly above the canvas floor. Renders telemetry anchors, crosshairs, and viewport framing without obscuring 3D star clusters.',
  },
  {
    id: 'dock',
    tierNumber: 'Tier 2',
    name: 'Dock',
    role: 'Persistent navigation shelf, scale selector, and command strip',
    surfaceToken: '--surface-dock-bg',
    borderToken: '--surface-dock-border-color',
    shadowToken: '--surface-dock-shadow',
    zIndex: 'var(--z-dock) (200)',
    explanation:
      'Fixed viewport-edge navigation bar. Features high-density specular rim lighting and subtle elevation shadow to separate persistent tools from rotating 3D scenes.',
  },
  {
    id: 'panel',
    tierNumber: 'Tier 3',
    name: 'Panel & Card',
    role: 'Primary reading surfaces: star dossiers, telemetry panels, orbital sheets',
    surfaceToken: '--surface-panel-bg',
    borderToken: '--surface-panel-border-color',
    shadowToken: '--surface-panel-shadow',
    zIndex: 'var(--z-panel) (300)',
    explanation:
      'The primary content container of the application. Employs a dense opaque surface fill with top-rim bevel and ambient drop shadow for sustained document reading.',
  },
  {
    id: 'drawer',
    tierNumber: 'Tier 4',
    name: 'Drawer',
    role: 'Full-height lateral filter sheets and deep catalog inspectors',
    surfaceToken: '--surface-drawer-bg',
    borderToken: '--surface-drawer-border-color',
    shadowToken: '--surface-drawer-shadow',
    zIndex: 'var(--z-drawer) (400)',
    explanation:
      'Sliding edge sheet spanning full viewport height. Features heavy directional elevation shadow along its inward boundary edge to clearly separate secondary controls.',
  },
  {
    id: 'popover',
    tierNumber: 'Tier 5',
    name: 'Popover & Tooltip',
    role: 'Contextual flyouts, coordinate inspections, and hover/click details',
    surfaceToken: '--surface-popover-bg',
    borderToken: '--surface-popover-border-color',
    shadowToken: '--surface-popover-shadow',
    blurToken: '--surface-popover-backdrop-blur (blur-3)',
    zIndex: 'var(--z-popover) (500)',
    explanation:
      'Lightweight floating surface hovering above panels and docks. Employs frosted glass optical blur and multi-layer elevation shadow to guarantee contrast over arbitrary backgrounds.',
  },
  {
    id: 'modal',
    tierNumber: 'Tier 6',
    name: 'Modal / Command Palette',
    role: 'Command Palette, deep coordinate queries, blocking dialogues',
    surfaceToken: '--surface-modal-bg',
    borderToken: '--surface-modal-border-color',
    shadowToken: '--surface-modal-shadow',
    blurToken: '--surface-modal-backdrop-blur (blur-4)',
    zIndex: 'var(--z-modal) (600)',
    explanation:
      'Primary focal sheet for user attention. Paired with a darkened backdrop scrim (--surface-scrim-bg) and deep ambient shadow to isolate dense keyboard workflows.',
  },
  {
    id: 'toast',
    tierNumber: 'Tier 7',
    name: 'Toast',
    role: 'Transient telemetry notifications, system errors, sensor alarms',
    surfaceToken: '--surface-toast-bg',
    borderToken: '--surface-toast-border-color',
    shadowToken: '--surface-toast-shadow',
    blurToken: '--surface-toast-backdrop-blur (blur-3)',
    zIndex: 'var(--z-toast) (700)',
    explanation:
      'The highest elevation plane in the interface stack. Floats above modals and drawers with maximum specular contrast and rapid temporal entrance animation.',
  },
];

export const ElevationsStory: StoryObj = {
  name: 'Elevations & Spatial Hierarchy',
  render: () => (
    <div className={styles.storyContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Elevations & Spatial Hierarchy</h1>
        <p className={styles.description}>
          Starmap structures the viewport as an 8-tier stack of semantic container
          planes anchored above the 3D WebGL canvas. Each tier is calibrated with
          a dedicated optical profile obeying the composite formula:
        </p>
        <div className={styles.formulaBox}>
          Surface Profile = Fill + Border Treatment + Elevation Shadow + Optics (Backdrop Blur)
        </div>
      </header>

      <div className={styles.breakdownStack}>
        {SURFACE_TIERS.map((tier) => (
          <article key={tier.id} className={styles.tierDetailCard}>
            <div className={styles.tierMetaRow}>
              <div className={styles.tierBadgeGroup}>
                <span className={styles.tierTag}>{tier.tierNumber}</span>
                <span className={styles.tierName}>{tier.name}</span>
              </div>
              <span className={styles.tierZIndex}>Stacking: {tier.zIndex}</span>
            </div>

            <p className={styles.tierExplanation}>{tier.explanation}</p>

            <div className={styles.tokenList}>
              <div className={styles.tokenItem}>
                <span className={styles.tokenProp}>Background</span>
                <span className={styles.tokenValue}>{tier.surfaceToken}</span>
              </div>
              <div className={styles.tokenItem}>
                <span className={styles.tokenProp}>Border</span>
                <span className={styles.tokenValue}>{tier.borderToken}</span>
              </div>
              <div className={styles.tokenItem}>
                <span className={styles.tokenProp}>Elevation Shadow</span>
                <span className={styles.tokenValue}>{tier.shadowToken}</span>
              </div>
              {tier.blurToken && (
                <div className={styles.tokenItem}>
                  <span className={styles.tokenProp}>Backdrop Optics</span>
                  <span className={styles.tokenValue}>{tier.blurToken}</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  ),
};

export const SurfaceGalleryStory: StoryObj = {
  name: 'Surface Gallery',
  render: () => (
    <div className={styles.storyContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Surface Gallery (Compact Matrix)</h1>
        <p className={styles.description}>
          Comparative optical palette rendering miniature tiles for every elevation tier
          side-by-side on the canvas background. Notice the progressive lightening in
          luminance, border crispness, and multi-layer edge shadows.
        </p>
      </header>

      <div className={styles.galleryGrid}>
        {SURFACE_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={styles.surfaceTile}
            data-surface={tier.id}
          >
            <div className={styles.tileHeader}>
              <span className={styles.tileTier}>{tier.tierNumber}</span>
              <span className={styles.tileToken}>{tier.zIndex.split(' ')[0]}</span>
            </div>

            <div className={styles.tileBody}>
              <span className={styles.tileRole}>{tier.name}</span>
              <span className={styles.tileShadowSpec}>{tier.surfaceToken}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};
