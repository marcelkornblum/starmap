import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Datum } from '../Datum/Datum';
import { Quantity } from '../Quantity/Quantity';
import { Unit } from '../Unit/Unit';
import { ConfidencePip } from '../ConfidencePip/ConfidencePip';
import { Badge } from '../Badge/Badge';

import styles from './Typography.module.css';

interface TableRowData {
  id: string;
  name: string;
  spectralType: string;
  semiMajorAxis: string;
  periodDays: string;
  eccentricity: string;
  radialVelocity: string;
  confidence: 'confirmed' | 'candidate' | 'theoretical' | 'unverified';
  confidenceLabel: string;
  status: 'nominal' | 'caution' | 'critical' | 'info';
  statusLabel: string;
}

const MOCKED_TABLE_DATA: TableRowData[] = [
  {
    id: 'trappist-1e',
    name: 'TRAPPIST-1e',
    spectralType: 'M4.0V',
    semiMajorAxis: '0.02928',
    periodDays: '6.10',
    eccentricity: '0.0051',
    radialVelocity: '-56.3',
    confidence: 'confirmed',
    confidenceLabel: 'Confirmed',
    status: 'nominal',
    statusLabel: 'LOCK',
  },
  {
    id: 'proxima-b',
    name: 'Proxima Centauri b',
    spectralType: 'M5.5V',
    semiMajorAxis: '0.04850',
    periodDays: '11.19',
    eccentricity: '0.0200',
    radialVelocity: '-22.4',
    confidence: 'confirmed',
    confidenceLabel: 'Confirmed',
    status: 'nominal',
    statusLabel: 'CALIBRATED',
  },
  {
    id: 'kepler-186f',
    name: 'Kepler-186f',
    spectralType: 'M1.0V',
    semiMajorAxis: '0.43200',
    periodDays: '129.94',
    eccentricity: '0.0400',
    radialVelocity: '-40.1',
    confidence: 'candidate',
    confidenceLabel: 'Candidate',
    status: 'caution',
    statusLabel: 'PENDING RV',
  },
  {
    id: 'gliese-581g',
    name: 'Gliese 581g',
    spectralType: 'M3.0V',
    semiMajorAxis: '0.14601',
    periodDays: '36.65',
    eccentricity: '0.0300',
    radialVelocity: '-9.5',
    confidence: 'theoretical',
    confidenceLabel: 'Theoretical',
    status: 'info',
    statusLabel: 'MODEL J2026',
  },
  {
    id: 'ross-128b',
    name: 'Ross 128 b',
    spectralType: 'M4.0V',
    semiMajorAxis: '0.04960',
    periodDays: '9.87',
    eccentricity: '0.0360',
    radialVelocity: '-31.0',
    confidence: 'confirmed',
    confidenceLabel: 'Confirmed',
    status: 'nominal',
    statusLabel: 'LOCK',
  },
  {
    id: 'wasp-121b',
    name: 'WASP-121b',
    spectralType: 'F6V',
    semiMajorAxis: '0.02544',
    periodDays: '1.27',
    eccentricity: '0.0000',
    radialVelocity: '+38.2',
    confidence: 'unverified',
    confidenceLabel: 'Unverified',
    status: 'critical',
    statusLabel: 'DISCORDANT',
  },
];

const meta: Meta = {
  title: 'INTERFACE/Information',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

export const TypographyStory: Story = {
  name: 'Typography',
  render: () => (
    <div className={styles.storyWrapper}>
      {/* Story Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Typography & Information Architecture</h1>
        <p className={styles.description}>
          Hierarchical type scale, editorial prose flow, contextual telemetry datums, and high-density
          tabular data adhering to the Starmap design system.
        </p>
      </header>

      <Stack gap="loose">
        {/* Section 1: Heading Scale */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>1. Heading Scale & Hierarchies</h2>
            <p className={styles.sectionDescription}>
              Display, headline, and title tiers consumed across navigation viewports and dossiers.
            </p>
          </div>

          <div className={styles.specimenCard}>
            <Stack gap="default">
              <Stack gap="none">
                <span className={styles.tokenLabel}>
                  --text-content-eyebrow-size (var(--type-scale-neg-1)) · UPPERCASE TRACKING
                </span>
                <p className={styles.eyebrow}>Astrometric Survey // Epoch J2026.10</p>
              </Stack>

              <Stack gap="none">
                <span className={styles.tokenLabel}>
                  --text-content-hero-title-size (var(--type-scale-3)) · 700 WEIGHT
                </span>
                <h1 className={styles.displayHeader}>3D Celestial Cartography & Navigation</h1>
              </Stack>

              <Stack gap="none">
                <span className={styles.tokenLabel}>
                  --text-content-title-size (var(--type-scale-2)) · 700 WEIGHT
                </span>
                <h2 className={styles.h1Header}>Exoplanetary Orbital Kinematics & Habitability</h2>
              </Stack>

              <Stack gap="none">
                <span className={styles.tokenLabel}>
                  --text-content-section-title-size (var(--type-scale-1)) · 600 WEIGHT
                </span>
                <h3 className={styles.h2Header}>Primary Stellar System Candidates</h3>
              </Stack>

              <Stack gap="none">
                <span className={styles.tokenLabel}>
                  --text-content-body-lead-size (var(--type-scale-1)) · 500 WEIGHT
                </span>
                <h4 className={styles.h3Header}>Sub-arcsecond Astrometry and Consensus Confirmation</h4>
              </Stack>
            </Stack>
          </div>
        </section>

        {/* Section 2: Editorial Prose Flow */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>2. Prose & Editorial Reading Flow</h2>
            <p className={styles.sectionDescription}>
              Body text calibrated for optical reading with 65ch line measure, comfortable leading, and inline semantics.
            </p>
          </div>

          <div className={styles.specimenCard}>
            <article className={styles.proseBlock}>
              <p className={styles.leadProse}>
                The Gaia Data Release 3 (DR3) catalog provides five-parameter astrometric solutions for over
                1.46 billion celestial sources, yielding microarcsecond-scale trigonometric parallaxes and proper
                motions calibrated directly against the International Celestial Reference Frame (ICRS).
              </p>

              <p className={styles.bodyProse}>
                For high-velocity stellar kinematics within the Galactic disk, radial velocities are derived
                from median Doppler shifts across the Ca II infrared triplet. Stellar targets exhibiting large
                tangential velocities undergo epoch-dependent coordinate propagation using rigorously verified
                ephemerides. Multiplicity or astrometric binary perturbations induce excess astrometric noise{' '}
                <code className={styles.codeSnippet}>epsi_i</code>, flagged as anomalous when the Renormalised
                Unit Weight Error exceeds the nominal threshold of <code className={styles.codeSnippet}>RUWE &gt; 1.40</code>.
              </p>

              <p className={styles.footnote}>
                † All derived distances and Cartesian galactic barycentric vectors utilize geometric parallax inversion
                with non-linear exponentially decreasing space density priors.
              </p>
            </article>
          </div>
        </section>

        {/* Section 3: Datum & Inline Telemetry */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>3. Contextual Datum & Telemetry Clusters</h2>
            <p className={styles.sectionDescription}>
              Coupled labels, monospaced values, astronomical units, and observational certainty pips.
            </p>
          </div>

          <div className={styles.specimenCard}>
            <Stack gap="default">
              <Cluster gap="loose" align="center">
                <Cluster gap="dense" align="center">
                  <ConfidencePip confidence="confirmed" />
                  <Datum label="Parallax Angle (ϖ)" value="768.13" unit="mas" status="nominal" />
                </Cluster>
                <Cluster gap="dense" align="center">
                  <ConfidencePip confidence="confirmed" />
                  <Datum label="Effective Temp (T_eff)" value="3,042" unit="K" />
                </Cluster>
                <Cluster gap="dense" align="center">
                  <ConfidencePip confidence="candidate" />
                  <Datum label="Radial Velocity (V_r)" value="-22.4" unit="km/s" status="caution" />
                </Cluster>
              </Cluster>

              <Cluster gap="loose" align="center">
                <Cluster gap="dense" align="center">
                  <ConfidencePip confidence="theoretical" />
                  <Datum label="Semi-Major Axis (a)" value="0.0485" unit="AU" />
                </Cluster>
                <Cluster gap="dense" align="center">
                  <ConfidencePip confidence="confirmed" />
                  <Datum label="Orbital Period (P)" value="11.186" unit="d" status="nominal" />
                </Cluster>
                <Cluster gap="dense" align="center">
                  <ConfidencePip confidence="unverified" />
                  <Datum label="Orbital Eccentricity (e)" value="0.02" unit="" status="critical" />
                </Cluster>
              </Cluster>

              <Cluster gap="default" align="center">
                <span>Composite Quantity Display:</span>
                <Quantity value="4.2465" unit="ly" />
                <span>·</span>
                <Quantity value="1.3019" unit="pc" />
                <span>·</span>
                <Unit>M_☉</Unit>
                <Badge status="nominal">VERIFIED EPHEMERIS</Badge>
              </Cluster>
            </Stack>
          </div>
        </section>

        {/* Section 4: Tabular Data */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>4. Tabular Data & Observation Matrices</h2>
            <p className={styles.sectionDescription}>
              High-density telemetry grid with semantic headers, table caption, monospaced tabular numerals, and status badges.
            </p>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table} data-testid="typography-story-table">
              <caption className={styles.caption}>
                <span className={styles.captionTitle}>Table 1.1:</span>
                Candidate Exoplanet Orbital Elements and Astrometric Kinematics (Gaia DR3 / Kepler Consensus)
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.th}>Target ID</th>
                  <th scope="col" className={styles.th}>Spectral Type</th>
                  <th scope="col" className={`${styles.th} ${styles.numericCell}`}>Semi-Major Axis (AU)</th>
                  <th scope="col" className={`${styles.th} ${styles.numericCell}`}>Period (Days)</th>
                  <th scope="col" className={`${styles.th} ${styles.numericCell}`}>Eccentricity</th>
                  <th scope="col" className={`${styles.th} ${styles.numericCell}`}>Radial Vel (km/s)</th>
                  <th scope="col" className={styles.th}>Confidence</th>
                  <th scope="col" className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCKED_TABLE_DATA.map((row) => (
                  <tr key={row.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.targetName}>{row.name}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.classificationTag}>{row.spectralType}</span>
                    </td>
                    <td className={`${styles.td} ${styles.numericCell}`}>
                      {row.semiMajorAxis}
                    </td>
                    <td className={`${styles.td} ${styles.numericCell}`}>
                      {row.periodDays}
                    </td>
                    <td className={`${styles.td} ${styles.numericCell}`}>
                      {row.eccentricity}
                    </td>
                    <td className={`${styles.td} ${styles.numericCell}`}>
                      {row.radialVelocity}
                    </td>
                    <td className={styles.td}>
                      <Cluster gap="dense" align="center">
                        <ConfidencePip confidence={row.confidence} />
                        <span>{row.confidenceLabel}</span>
                      </Cluster>
                    </td>
                    <td className={styles.td}>
                      <Badge status={row.status}>{row.statusLabel}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Stack>
    </div>
  ),
};
