import React, { useMemo, useState } from 'react';
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

        <h3>Classification: {combination.combinedCode}</h3>

        <dl data-testid="combinator-computed-telemetry" className={styles.telemetryDl}>
          <dt>Effective Temperature</dt>
          <dd>{combination.effectiveTempK} K</dd>
          <dt>Radius</dt>
          <dd>{combination.radiusRsun} R☉</dd>
          <dt>Bolometric Luminosity</dt>
          <dd>{combination.luminosityLsun} L☉</dd>
          <dt>Habitable Zone</dt>
          <dd>{combination.habitableZoneAu}</dd>
          <dt>Chromaticity</dt>
          <dd>{combination.chromaticityHex}</dd>
        </dl>

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
        <h2 id="star-type-combinator-heading">Yerkes Spectral Combinator</h2>
        <p>
          Interactive 3-slice combinator illustrating how spectral temperature class,
          subdivision, and luminosity class dictate stellar astrophysics.
        </p>

        <div data-testid="combinator-slice-class" className={styles.sliceRow}>
          <strong>Slice 1: Spectral Class</strong>
          <div className={styles.sliceButtonGroup}>
            {CLASS_CHOICES.map((cls) => (
              <button
                key={cls}
                type="button"
                aria-pressed={selectedClass === cls}
                onClick={() => setSelectedClass(cls)}
                className={styles.sliceButton}
              >
                {cls}
              </button>
            ))}
          </div>
          <p data-testid="combinator-class-effect" className={styles.sliceEffect}>
            {combination.classEffect}
          </p>
        </div>

        <div data-testid="combinator-slice-subdivision" className={styles.sliceRow}>
          <strong>Slice 2: Subdivision (0–9)</strong>
          <div className={styles.sliceButtonGroup}>
            {SUBDIVISION_CHOICES.map((sub) => (
              <button
                key={sub}
                type="button"
                aria-pressed={selectedSub === sub}
                onClick={() => setSelectedSub(sub)}
                className={styles.sliceButton}
              >
                {sub}
              </button>
            ))}
          </div>
          <p data-testid="combinator-subdivision-effect" className={styles.sliceEffect}>
            {combination.subdivisionEffect}
          </p>
        </div>

        <div data-testid="combinator-slice-luminosity" className={styles.sliceRow}>
          <strong>Slice 3: Luminosity Class</strong>
          <div className={styles.sliceButtonGroup}>
            {LUMINOSITY_CHOICES.map((lum) => (
              <button
                key={lum}
                type="button"
                aria-pressed={selectedLum === lum}
                onClick={() => setSelectedLum(lum)}
                className={styles.sliceButton}
              >
                {lum}
              </button>
            ))}
          </div>
          <p data-testid="combinator-luminosity-effect" className={styles.sliceEffect}>
            {combination.luminosityEffect}
          </p>
        </div>
      </div>
    </section>
  );
};
