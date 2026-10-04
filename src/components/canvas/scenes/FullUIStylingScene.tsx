import type React from 'react';
import { useState } from 'react';
import {
  Hud,
  Dock,
  Panel,
  Well,
  Card,
} from '../../surfaces';
import {
  Drawer,
  Modal,
  Popover,
  Toast,
} from '../../overlays';
import {
  Stack,
  Cluster,
  Button,
  Input,
  Slider,
  Toggle,
  Badge,
  Datum,
  Metric,
} from '../../primitives';
import { OrbitTable, type OrbitElementRow } from '../../domain';
import { GalacticViewScene } from './SpatialScenes.stories';
import styles from './FullUIStylingScene.module.css';

const DEMO_ORBITS: OrbitElementRow[] = [
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
    periodDays: 365.26,
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
    eccentricity: 0.0484,
    inclination: 1.3,
    periodDays: 4332.59,
  },
];

export interface FullUIStylingSceneProps {
  initialDrawerOpen?: boolean;
  initialModalOpen?: boolean;
  initialPopoverOpen?: boolean;
  initialToastVisible?: boolean;
}

/**
 * FullUIStylingScene: Test and verification scene representing all 8 design system surface tiers
 * simultaneously over the 3D Galactic Cartography Canvas.
 *
 * Tier 0: --surface-canvas (3D WebGL Floor: GalacticViewScene)
 * Tier 1: --surface-hud (Pinned Reticles, Tools: Hud)
 * Tier 2: --surface-dock (Persistent Navigation Shelf: Dock)
 * Tier 3: --surface-panel (Dossiers & Telemetry: Panel)
 * Tier 4: --surface-drawer (Full-Height Sliding Filters: Drawer)
 * Tier 5: --surface-popover (Context Flyouts & Tooltips: Popover)
 * Tier 6: --surface-modal (Command Palette & Dialogues: Modal)
 * Tier 7: --surface-toast (Transient System Alerts: Toast)
 * Nested: --surface-inset (Sunken Wells & Tabular Insets: Well)
 */
export const FullUIStylingScene: React.FC<FullUIStylingSceneProps> = ({
  initialDrawerOpen = true,
  initialModalOpen = true,
  initialPopoverOpen = true,
  initialToastVisible = true,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(initialDrawerOpen);
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [isPopoverOpen, setIsPopoverOpen] = useState(initialPopoverOpen);
  const [isToastVisible, setIsToastVisible] = useState(initialToastVisible);

  // Drawer form control states
  const [parallaxCutoff, setParallaxCutoff] = useState(45);
  const [magnitudeLimit, setMagnitudeLimit] = useState(12);
  const [showBinaries, setShowBinaries] = useState(true);
  const [showStalks, setShowStalks] = useState(true);

  return (
    <div className={styles.fullUiContainer} data-testid="full-ui-styling-scene">
      {/* --------------------------------------------------------------------- */}
      {/* Tier 0: --surface-canvas (3D WebGL Floor)                            */}
      {/* --------------------------------------------------------------------- */}
      <div className={styles.canvasLayer} data-testid="surface-tier-0-canvas">
        <GalacticViewScene className={styles.canvasOverride} />
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Tier 1: --surface-hud (Pinned reticles, tools, HUD telemetry bar)      */}
      {/* --------------------------------------------------------------------- */}
      <Hud
        position="top"
        className={styles.hudBar}
        title="Tier 1: HUD - Starmap Telemetry"
        data-testid="surface-tier-1-hud"
      >
        <Cluster justify="between" align="center">
          <Cluster gap="default" align="center">
            <span className={styles.brandTitle} title="Tier 1: HUD - Brand">✦ STARMAP // [Tier 1: HUD]</span>
            <Badge status="nominal">SENSORS ONLINE</Badge>
            <span className={styles.sectorLabel}>Sector: Orion-Cygnus Arm (Sol Region)</span>
          </Cluster>

          <span className={styles.hudCenter}>
            RA: 18h 36m 56s · Dec: +38° 47′ 01″ · Epoch: J2000.0 · Frame: ICRS
          </span>

          <Cluster gap="tight" align="center">
            <Badge status="info">ZOOM 10.0 pc</Badge>
            <Button
              size="sm"
              variant={isDrawerOpen ? 'primary' : 'subtle'}
              onClick={() => setIsDrawerOpen((prev) => !prev)}
            >
              FILTERS
            </Button>
            <Button
              size="sm"
              variant={isModalOpen ? 'primary' : 'subtle'}
              onClick={() => setIsModalOpen((prev) => !prev)}
            >
              COMMAND
            </Button>
          </Cluster>
        </Cluster>
      </Hud>

      {/* --------------------------------------------------------------------- */}
      {/* Tier 2: --surface-dock (Persistent navigation shelf docked to window) */}
      {/* --------------------------------------------------------------------- */}
      <Dock
        position="right"
        className={styles.dockOverride}
        title="Tier 2: Dock"
        data-testid="surface-tier-2-dock"
      >
        <Stack gap="tight">
          <Button variant="primary" size="sm" title="Tier 2: Dock - Galaxy Overview" aria-label="Galaxy Overview">
            GAL
          </Button>
          <Button variant="subtle" size="sm" title="Tier 2: Dock - System Navigation" aria-label="System Navigation">
            SYS
          </Button>
          <Button variant="subtle" size="sm" title="Tier 2: Dock - Planetary Bodies" aria-label="Planetary Bodies">
            PLN
          </Button>
          <Button variant="subtle" size="sm" title="Tier 2: Dock - Astrometry Catalog" aria-label="Astrometry Catalog">
            CAT
          </Button>
          <Button
            variant="subtle"
            size="sm"
            title="Tier 2: Dock - Toggle Filter Drawer"
            aria-label="Toggle Filter Drawer"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
          >
            FLT
          </Button>
        </Stack>
      </Dock>

      {/* --------------------------------------------------------------------- */}
      {/* Tier 3: --surface-panel (Dossiers, telemetry sheets & cards)          */}
      {/* --------------------------------------------------------------------- */}
      <div className={styles.panelContainer} data-testid="surface-tier-3-panel">
        <Panel
          header="[Tier 3: Panel] Galactic Survey Dossier"
          title="Tier 3: Panel - Galactic Survey Dossier"
          footer={
            <Cluster justify="between" align="center">
              <span>Epoch 2026.10 // Telemetry</span>
              <Badge status="nominal">VERIFIED</Badge>
            </Cluster>
          }
        >
          <Stack gap="default">
            <p className={styles.panelLead}>
              Local arm survey telemetry covering candidates within 10 pc radius of Sol barycentre.
            </p>

            <Cluster gap="default">
              <Metric label="Census" value="1,280" unit="stars" />
              <Metric label="Solar Dist" value="8.12" unit="kpc" />
              <Metric label="Bulk V_r" value="-220" unit="km/s" />
            </Cluster>

            {/* Nested Inset: --surface-inset (Sunken wells, inputs) */}
            <Well tabular padding="tight" title="Nested Inset: Well" data-testid="surface-tier-nested-inset">
              <OrbitTable caption="[Nested Inset: Well] Nearby Astrometric Candidates" orbits={DEMO_ORBITS} />
            </Well>

            <Stack gap="dense">
              <Datum label="Galactic Longitude (l)" value="000.00°" />
              <Datum label="Galactic Latitude (b)" value="+00.00°" />
              <Datum label="Oort Constant A" value="14.8" unit="km/s/kpc" />
              <Datum label="Interstellar Extinction" value="0.04" unit="mag/kpc" status="nominal" />
            </Stack>
          </Stack>
        </Panel>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Tier 5: --surface-popover (Context flyouts, tooltips)                  */}
      {/* --------------------------------------------------------------------- */}
      <div className={styles.popoverAnchor} data-testid="surface-tier-5-popover" title="Tier 5: Popover">
        <Popover
          isOpen={isPopoverOpen}
          position="bottom"
          trigger={
            <Card
              padding="tight"
              status="nominal"
              interactive
              title="Tier 5: Popover - Sol Barycentre Anchor"
              onClick={() => setIsPopoverOpen((prev) => !prev)}
            >
              <Cluster gap="tight" align="center">
                <span>[Tier 5: Popover] Target Lock: Sol Barycentre [0, 0, 0]</span>
                <Badge status="nominal">LOCKED</Badge>
              </Cluster>
            </Card>
          }
        >
          <div className={styles.popoverContent} title="Tier 5: Popover - Sol Telemetry">
            <Stack gap="dense">
              <Cluster justify="between" align="center">
                <strong title="Tier 5: Popover - Sol Anchor Point">[Tier 5: Popover] Sol Anchor Point</strong>
                <Badge category="star">G2V</Badge>
              </Cluster>
              <p className={styles.popoverDesc}>
                Origin anchor for ICRS celestial coordinates and local velocity standard.
              </p>
              <Datum label="Cartesian" value="[0.0, 0.0, 0.0] pc" />
              <Datum label="Radial Velocity" value="0.00" unit="km/s" />
              <Datum label="Observational Quality" value="99.98%" status="nominal" />
              <Cluster gap="tight">
                <Button size="sm" variant="primary">TRACK RETICLE</Button>
                <Button size="sm" variant="subtle" onClick={() => setIsPopoverOpen(false)}>
                  DISMISS
                </Button>
              </Cluster>
            </Stack>
          </div>
        </Popover>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Tier 6: --surface-modal (Command Palette, dialogues)                  */}
      {/* --------------------------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen}
        isModal={false}
        title="[Tier 6: Modal] Astrodynamics Command Query"
        onClose={() => setIsModalOpen(false)}
        className={styles.previewModal}
        data-testid="surface-tier-6-modal"
      >
        <Stack gap="default">
          <Stack gap="tight">
            <label htmlFor="catalog-search" className={styles.inputLabel}>
              Search Celestial Catalog
            </label>
            <Input
              id="catalog-search"
              aria-label="Search Celestial Catalog"
              placeholder="Search stars, constellations, or coordinates..."
              defaultValue="Alpha Centauri"
            />
          </Stack>
          <Cluster gap="dense">
            <Badge category="star">Alpha Centauri A (G2V)</Badge>
            <Badge category="star">Alpha Centauri B (K1V)</Badge>
            <Badge category="planet">Proxima Cen b</Badge>
            <Badge confidence="confirmed">J2000.0</Badge>
          </Cluster>
          <p className={styles.popoverDesc}>
            Target selected entry to re-center cartographic reticle or execute warp trajectory.
          </p>
          <Cluster justify="between" align="center">
            <span className={styles.shortcutHint}>Press ESC to dismiss or ↵ to target</span>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Navigate
            </Button>
          </Cluster>
        </Stack>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* Tier 4: --surface-drawer (Full-height sliding filters & drawers)      */}
      {/* --------------------------------------------------------------------- */}
      <Drawer
        position="right"
        isOpen={isDrawerOpen}
        isModal={false}
        title="[Tier 4: Drawer] Spectroscopic Filter Matrix"
        onClose={() => setIsDrawerOpen(false)}
        className={styles.previewDrawer}
        data-testid="surface-tier-4-drawer"
      >
        <Stack gap="default">
          <p className={styles.drawerDesc}>
            Spectroscopic criteria and range gating parameters for galactic canvas projection.
          </p>
          <Stack gap="tight">
            <label htmlFor="catalog-identifier" className={styles.inputLabel}>
              Catalog Identifier
            </label>
            <Input
              id="catalog-identifier"
              aria-label="Catalog Identifier"
              placeholder="e.g. HIP, GAIA DR3, HD"
              defaultValue="GAIA DR3 2026"
            />
          </Stack>
          <Slider
            label="Parallax Threshold"
            min={0}
            max={100}
            value={parallaxCutoff}
            onChange={setParallaxCutoff}
          />
          <Slider
            label="Magnitude Limit (G)"
            min={-2}
            max={20}
            value={magnitudeLimit}
            onChange={setMagnitudeLimit}
          />
          <Toggle
            label="Include Binary Companions"
            checked={showBinaries}
            onChange={setShowBinaries}
          />
          <Toggle
            label="Project Polar Elevation Stalks"
            checked={showStalks}
            onChange={setShowStalks}
          />
          <Cluster gap="dense">
            <Badge category="star">O/B Stars</Badge>
            <Badge category="star">A/F Main Seq</Badge>
            <Badge category="star">G/K Dwarfs</Badge>
            <Badge category="star">M Dwarfs</Badge>
          </Cluster>
          <Cluster gap="default">
            <Button variant="primary" onClick={() => setIsDrawerOpen(false)}>
              Apply Filters
            </Button>
            <Button variant="subtle" onClick={() => setIsDrawerOpen(false)}>
              Reset
            </Button>
          </Cluster>
        </Stack>
      </Drawer>

      {/* --------------------------------------------------------------------- */}
      {/* Tier 7: --surface-toast (Transient system alerts)                     */}
      {/* --------------------------------------------------------------------- */}
      {isToastVisible && (
        <div className={styles.toastContainer} data-testid="surface-tier-7-toast">
          <Toast
            status="caution"
            title="[Tier 7: Toast] Telemetry Alert: Gravitational Perturbation"
            message="Transient burst detected at galactic coordinates (l=0.12°, b=-0.04°). In-situ sensors observing 4.2 mas perturbation."
            onClose={() => setIsToastVisible(false)}
          />
        </div>
      )}
    </div>
  );
};
