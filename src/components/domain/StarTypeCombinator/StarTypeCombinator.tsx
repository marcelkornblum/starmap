import React, { useMemo, useState } from 'react';
import {
  Button,
  Cluster,
  Datum,
  Heading,
  Stack,
  Unit,
} from '../../interface';
import {
  buildStarTypeGuideHref,
  computeSpectralCombination,
} from '../../../services/guideService';
import { Guide3DPreview } from '../Guide3DPreview';
import styles from './StarTypeCombinator.module.css';

export interface StarTypeCombinatorProps {
  readonly initialClass?: string;
  readonly initialSubdivision?: string;
  readonly initialLuminosity?: string;
}

const CLASS_CHOICES = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'L', 'D'] as const;
const SUBDIVISION_CHOICES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
const LUMINOSITY_CHOICES = ['I', 'III', 'IV', 'V', 'VII'] as const;

export const StarTypeCombinator: React.FC<StarTypeCombinatorProps> = ({
  initialClass = 'G',
  initialSubdivision = '2',
  initialLuminosity = 'V',
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedSub, setSelectedSub] = useState<string>(initialSubdivision);
  const [selectedLum, setSelectedLum] = useState<string>(initialLuminosity);

  const combination = useMemo(
    () => computeSpectralCombination(selectedClass, selectedSub, selectedLum),
    [selectedClass, selectedSub, selectedLum],
  );

  return (
    <section
      aria-labelledby="star-type-combinator-heading"
      data-testid="star-type-combinator"
      className={styles.combinatorSection}
    >
      <div data-testid="combinator-output" className={styles.combinatorOutput}>
        <Guide3DPreview
          kind="star"
          spectralClass={combination.combinedCode}
          spectralLetter={selectedClass}
          luminosityClass={selectedLum}
          radiusRsun={combination.radiusRsun}
          tempK={combination.effectiveTempK}
          chromaticityHex={combination.chromaticityHex}
          isDetail
        />

        <Heading as="h3">Classification: {combination.combinedCode}</Heading>

        <Stack gap="none" data-testid="combinator-computed-telemetry">
          <Datum
            label="Effective Temperature"
            value={combination.effectiveTempK}
            unit={<Unit href="/guide/metrics/effective-temperature">K</Unit>}
          />
          <Datum
            label="Radius"
            value={combination.radiusRsun}
            unit={<Unit href="/guide/metrics/stellar-radius">R☉</Unit>}
          />
          <Datum
            label="Bolometric Luminosity"
            value={combination.luminosityLsun}
            unit={<Unit href="/guide/metrics/stellar-luminosity">L☉</Unit>}
          />
          <Datum
            label="Habitable Zone"
            value={combination.habitableZoneAu}
          />
          <Datum
            label="Chromaticity"
            value={combination.chromaticityHex}
          />
        </Stack>

        <p>
          <a
            href={buildStarTypeGuideHref(combination.combinedCode)}
            data-testid="combinator-permalink"
          >
            {combination.combinedCode}
          </a>
        </p>
      </div>

      <div className={styles.combinatorControls}>
        <Heading as="h2" id="star-type-combinator-heading">Yerkes Spectral Combinator</Heading>
        <p>
          Interactive 3-slice combinator illustrating how spectral temperature class,
          subdivision, and luminosity class dictate stellar astrophysics.
        </p>

        <div data-testid="combinator-slice-class" className={styles.sliceRow}>
          <strong>Slice 1: Spectral Class</strong>
          <Cluster gap="dense" className={styles.sliceButtonGroup}>
            {CLASS_CHOICES.map((cls) => (
              <Button
                key={cls}
                size="sm"
                variant={selectedClass === cls ? 'primary' : 'default'}
                aria-pressed={selectedClass === cls}
                onClick={() => setSelectedClass(cls)}
              >
                {cls}
              </Button>
            ))}
          </Cluster>
          <p data-testid="combinator-class-effect" className={styles.sliceEffect}>
            {combination.classEffect}
          </p>
        </div>

        <div data-testid="combinator-slice-subdivision" className={styles.sliceRow}>
          <strong>Slice 2: Subdivision (0–9)</strong>
          <Cluster gap="dense" className={styles.sliceButtonGroup}>
            {SUBDIVISION_CHOICES.map((sub) => (
              <Button
                key={sub}
                size="sm"
                variant={selectedSub === sub ? 'primary' : 'default'}
                aria-pressed={selectedSub === sub}
                onClick={() => setSelectedSub(sub)}
              >
                {sub}
              </Button>
            ))}
          </Cluster>
          <p data-testid="combinator-subdivision-effect" className={styles.sliceEffect}>
            {combination.subdivisionEffect}
          </p>
        </div>

        <div data-testid="combinator-slice-luminosity" className={styles.sliceRow}>
          <strong>Slice 3: Luminosity Class</strong>
          <Cluster gap="dense" className={styles.sliceButtonGroup}>
            {LUMINOSITY_CHOICES.map((lum) => (
              <Button
                key={lum}
                size="sm"
                variant={selectedLum === lum ? 'primary' : 'default'}
                aria-pressed={selectedLum === lum}
                onClick={() => setSelectedLum(lum)}
              >
                {lum}
              </Button>
            ))}
          </Cluster>
          <p data-testid="combinator-luminosity-effect" className={styles.sliceEffect}>
            {combination.luminosityEffect}
          </p>
        </div>
      </div>
    </section>
  );
};
