import type React from 'react';
import { Panel } from '../../../interface/surfaces/Panel/Panel';
import { Well } from '../../../interface/surfaces/Well/Well';
import { Badge, type BadgeStatus } from '../../../interface/data/Badge/Badge';
import { Metric } from '../../primitives/data/Metric/Metric';
import { Datum } from '../../../interface/data/Datum/Datum';
import { ConfidencePip } from '../../../interface/data/ConfidencePip/ConfidencePip';
import { Button } from '../../../interface/control/Button/Button';
import { Cluster } from '../../../interface/layout/Cluster/Cluster';
import { Stack } from '../../../interface/layout/Stack/Stack';
import { OrbitTable, type OrbitElementRow } from '../OrbitTable/OrbitTable';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import type { ThemePalette, UITheme } from '../../../../stores/useSettingsStore';
import styles from './TypographyReview.module.css';

export interface TypographyReviewProps {
  /** Role 1: Interface UI sans font (--font-interface) */
  interfaceFont?: 'space-grotesk' | 'inter' | 'outfit' | 'plus-jakarta' | 'system' | 'mono';
  /** Role 2: Numerical telemetry & tabular monospace font (--font-data) */
  dataFont?: 'jetbrains' | 'fira-code' | 'space-mono' | 'system-mono';
  /** Role 3: Long-form reading & prose copy font (--font-copy) */
  copyFont?: 'newsreader' | 'georgia' | 'sans';
  /** Modular ratio progression (--type-ratio) */
  typeRatio?: 'major-second' | 'minor-third' | 'major-third' | 'perfect-fourth' | 'augmented-fourth';
  /** Panel title typography scale step */
  titleSize?: 'scale-1' | 'scale-2' | 'scale-3' | 'scale-4';
  /** Panel title font weight */
  titleWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /** Panel subtitle typography scale step */
  subtitleSize?: 'scale-neg-1' | 'scale-0' | 'scale-1';
  /** Panel subtitle text transform */
  subtitleCase?: 'none' | 'uppercase';
  /** Panel subtitle letter tracking */
  subtitleTracking?: 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
  /** Description prose typography scale step */
  descriptionSize?: 'scale-neg-1' | 'scale-0' | 'scale-1';
  /** Description prose line height (leading) */
  descriptionLeading?: 'body' | 'prose' | 'heading';
  /** Table cell data font size */
  tableDataSize?: 'scale-neg-3' | 'scale-neg-2' | 'scale-neg-1' | 'scale-0';
  /** Table header font size */
  tableHeaderSize?: 'scale-neg-3' | 'scale-neg-2' | 'scale-neg-1' | 'scale-0';
  /** Status badge visual condition */
  badgeStatus?: BadgeStatus;
  /** Active palette override */
  palette?: ThemePalette;
  /** Active theme mode override */
  theme?: UITheme;
  /** Custom title text */
  titleText?: string;
  /** Custom subtitle text */
  subtitleText?: string;
  /** Custom badge label */
  badgeText?: string;
  /** Custom body text description */
  descriptionText?: string;
  /** Selected orbit row in table */
  selectedOrbitId?: string;
  /** Show theme switcher widget inside review view */
  showThemeSwitcher?: boolean;
}

const DEFAULT_REVIEW_ORBITS: OrbitElementRow[] = [
  {
    id: 'trappist-1e',
    name: 'TRAPPIST-1e',
    semiMajorAxis: 0.029,
    eccentricity: 0.0051,
    inclination: 89.77,
    periodDays: 6.10,
    confidence: 'confirmed',
  },
  {
    id: 'proxima-b',
    name: 'Proxima Centauri b',
    semiMajorAxis: 0.0485,
    eccentricity: 0.0200,
    inclination: 88.20,
    periodDays: 11.19,
    confidence: 'confirmed',
  },
  {
    id: 'earth',
    name: 'Earth (Sol III)',
    semiMajorAxis: 1.000,
    eccentricity: 0.0167,
    inclination: 0.00,
    periodDays: 365.25,
    confidence: 'confirmed',
  },
  {
    id: 'kepler-186f',
    name: 'Kepler-186f',
    semiMajorAxis: 0.432,
    eccentricity: 0.0400,
    inclination: 89.90,
    periodDays: 129.94,
    confidence: 'candidate',
  },
  {
    id: 'jupiter',
    name: 'Jupiter (Sol V)',
    semiMajorAxis: 5.204,
    eccentricity: 0.0489,
    inclination: 1.30,
    periodDays: 4332.59,
    confidence: 'confirmed',
  },
];

export const TypographyReview: React.FC<TypographyReviewProps> = ({
  interfaceFont = 'space-grotesk',
  dataFont = 'jetbrains',
  copyFont = 'newsreader',
  typeRatio = 'major-third',
  titleSize = 'scale-2',
  titleWeight = 'semibold',
  subtitleSize = 'scale-0',
  subtitleCase = 'none',
  subtitleTracking = 'normal',
  descriptionSize = 'scale-0',
  descriptionLeading = 'prose',
  tableDataSize = 'scale-neg-1',
  tableHeaderSize = 'scale-neg-2',
  badgeStatus = 'nominal',
  palette = 'carbon',
  theme = 'dark',
  titleText = '✦ EXOPLANET HABITABILITY & ORBITAL TELEMETRY',
  subtitleText = 'Astrometric Survey & Orbital Dynamics // Epoch J2026.10 (Gaia DR3 Calibrated)',
  badgeText = 'VERIFIED SURVEY',
  descriptionText = 'High-precision Keplerian orbital elements and astrometric telemetry for candidate terrestrial and Jovian worlds within the local stellar neighbourhood. All radial velocities and proper motions are calibrated against the Gaia DR3 celestial reference frame and adjusted for Solar barycentric motion.',
  selectedOrbitId = 'earth',
  showThemeSwitcher = true,
}) => {
  return (
    <div
      className={styles.reviewContainer}
      data-palette={palette}
      data-theme={theme}
      data-interface-font={interfaceFont}
      data-data-font={dataFont}
      data-copy-font={copyFont}
      data-type-ratio={typeRatio}
      data-title-size={titleSize}
      data-title-weight={titleWeight}
      data-subtitle-size={subtitleSize}
      data-subtitle-case={subtitleCase}
      data-subtitle-tracking={subtitleTracking}
      data-description-size={descriptionSize}
      data-description-leading={descriptionLeading}
      data-table-data-size={tableDataSize}
      data-table-header-size={tableHeaderSize}
      data-testid="typography-review-container"
    >
      <Stack gap="default" className={styles.panelOverride}>
        {/* Top Header / Switcher Bar */}
        {showThemeSwitcher && (
          <Cluster justify="between" align="center">
            <div className={styles.specimenBar}>
              <span>UI (--font-interface): </span>
              <span className={styles.specimenChip}>{interfaceFont}</span>
              <span> · DATA (--font-data): </span>
              <span className={styles.specimenChip}>{dataFont}</span>
              <span> · PROSE (--font-copy): </span>
              <span className={styles.specimenChip}>{copyFont}</span>
              <span> · RATIO: </span>
              <span className={styles.specimenChip}>{typeRatio}</span>
            </div>
            <ThemeSwitcher compact />
          </Cluster>
        )}

        {/* Target Review Panel */}
        <Panel
          header={
            <Cluster justify="between" align="center">
              <Stack gap="dense">
                <h2 className={styles.title}>{titleText}</h2>
                <div className={styles.subtitle}>{subtitleText}</div>
              </Stack>
              <Cluster gap="dense" align="center">
                <Button variant="default" size="sm">Calibrate</Button>
                <Button variant="primary" size="sm">Telemetry Sync</Button>
                <Badge status={badgeStatus}>{badgeText}</Badge>
              </Cluster>
            </Cluster>
          }
          footer={
            <Cluster justify="between" align="center">
              <Cluster gap="dense" align="center">
                <ConfidencePip confidence="confirmed" />
                <span>ICRS Epoch J2026.10 · Sol Barycentre Reference Frame</span>
              </Cluster>
              <Cluster gap="dense" align="center">
                <Button variant="subtle" size="sm">Export CSV</Button>
                <Button variant="default" size="sm">Inspect Slab</Button>
                <Button variant="primary" size="sm">Propagate Target</Button>
                <Badge status="info">10.0 pc SURVEY</Badge>
              </Cluster>
            </Cluster>
          }
        >
          <Stack gap="default">
            {/* Metric Strip: Labels in --font-interface, Numbers in --font-data */}
            <Cluster gap="default">
              <Metric label="Census" value="1,280" unit="stars" />
              <Metric label="Solar Dist" value="8.12" unit="kpc" />
              <Metric label="Bulk V_r" value="-220.4" unit="km/s" />
              <Metric label="Confidence" value="99.94%" unit="Q_ast" />
            </Cluster>

            {/* Description Text: Editorial reading prose consuming --font-copy */}
            <p className={styles.description}>{descriptionText}</p>

            {/* Data Table inside Sunken Inset Well: Headers in --font-interface, Numbers in --font-data */}
            <Well tabular padding="none" title="Nested Inset: Well" data-testid="typography-review-well">
              <div className={styles.tableWrapper}>
                <OrbitTable
                  caption="Orbital Elements of Astrometric Candidates"
                  orbits={DEFAULT_REVIEW_ORBITS}
                  selectedId={selectedOrbitId}
                />
              </div>
            </Well>

            {/* Key-Value Telemetry Datums: Labels in --font-interface, Values in --font-data */}
            <Stack gap="dense">
              <Cluster gap="dense" align="center">
                <ConfidencePip confidence="confirmed" details="Gaia DR3 astrometric precision ±0.0012 mas" />
                <Datum label="Astrometric Precision" value="±0.0012 mas" unit="Gaia DR3" status="nominal" />
              </Cluster>
              <Cluster gap="dense" align="center">
                <ConfidencePip confidence="candidate" details="Extinction calibrated against 2MASS NIR baseline" />
                <Datum label="Interstellar Extinction (A_V)" value="0.04" unit="mag/kpc" status="nominal" />
              </Cluster>
              <Cluster gap="dense" align="center">
                <ConfidencePip confidence="theoretical" details="Kinematic extrapolation model J2026.10" />
                <Datum label="Oort Constant A" value="14.8" unit="km/s/kpc" />
              </Cluster>
              <Cluster gap="dense" align="center">
                <ConfidencePip confidence="unverified" details="Preliminary cross-match without trigonometric parallax" />
                <Datum label="Galactic Longitude (l)" value="000.00°" />
              </Cluster>
              <Cluster gap="dense" align="center">
                <ConfidencePip confidence="unverified" details="Awaiting secondary spectral confirmation" />
                <Datum label="Galactic Latitude (b)" value="+00.00°" />
              </Cluster>
            </Stack>
          </Stack>
        </Panel>
      </Stack>
    </div>
  );
};
