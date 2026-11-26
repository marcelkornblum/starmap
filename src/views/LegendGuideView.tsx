import type React from 'react';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import {
  Badge,
  Block,
  CELESTIAL_SYMBOL_META,
  CelestialSymbol,
  Cluster,
  ConfidencePip,
  Grid,
  Heading,
  SpectralBadge,
  Stack,
} from '../components/interface';
import {
  LEGEND_CHROMATIC_ENTRIES,
  LEGEND_CONFIDENCE_LEVELS,
  LEGEND_LINE_ENTRIES,
  LEGEND_SPECTRAL_CLASSES,
  LEGEND_SYMBOL_GROUPS,
  LEGEND_ZONE_ENTRIES,
  STAR_TYPES_GUIDE_PATH,
} from '../content/guide';
import { resolveAppHref } from '../utils/url';
import guideStyles from './GuideViews.module.css';
import styles from './LegendGuideView.module.css';

export const LegendGuideView: React.FC = () => {
  return (
    <main data-testid="legend-guide-view-root" className={guideStyles.guideRoot}>
      <Breadcrumbs
        items={[
          { label: 'Guide', href: STAR_TYPES_GUIDE_PATH },
          { label: 'Cartography & Symbology' },
        ]}
      />
      <GuideSectionNav currentSection="legend" />
      <Heading as="h1">Cartography &amp; Symbology</Heading>

      <Stack gap="section">
        <section aria-labelledby="legend-lines-heading" data-testid="legend-lines-section">
          <Stack gap="default">
            <Heading as="h2" id="legend-lines-heading">
              Lines &amp; Trajectories
            </Heading>
            <Grid as="ul" minWidth="md" gap="default">
              {LEGEND_LINE_ENTRIES.map((entry) => (
                <Block
                  as="li"
                  padding="loose"
                  key={entry.id}
                  data-testid="legend-line-item"
                  data-line-kind={entry.id}
                >
                  <Stack gap="tight">
                    <span className={styles.swatchStage} aria-hidden="true">
                      <span
                        className={styles.lineSwatch}
                        data-line-kind={entry.id}
                        aria-hidden="true"
                      />
                    </span>
                    <Cluster gap="tight" align="center" justify="between">
                      <span className={styles.symbolTitle}>{entry.title}</span>
                      <Badge status="neutral">{entry.patternLabel}</Badge>
                    </Cluster>
                    <span className={styles.tokenMeta}>{entry.tokenRef}</span>
                    <p className={styles.descriptionText}>{entry.description}</p>
                  </Stack>
                </Block>
              ))}
            </Grid>
          </Stack>
        </section>

        <section aria-labelledby="legend-zones-heading" data-testid="legend-zones-section">
          <Stack gap="default">
            <Heading as="h2" id="legend-zones-heading">
              Zones &amp; Thermal Boundaries
            </Heading>
            <Grid as="ul" minWidth="md" gap="default">
              {LEGEND_ZONE_ENTRIES.map((entry) => (
                <Block
                  as="li"
                  padding="loose"
                  key={entry.id}
                  data-testid="legend-zone-item"
                  data-region-kind={entry.regionKind}
                >
                  <Stack gap="tight">
                    <span
                      className={styles.zoneSwatch}
                      data-region-kind={entry.regionKind}
                      aria-hidden="true"
                    >
                      {entry.regionKind === 'habitable-zone' ? (
                        <CelestialSymbol type="habitable-zone" size="sm" showTooltip={false} />
                      ) : null}
                    </span>
                    <span className={styles.symbolTitle}>{entry.title}</span>
                    <span className={styles.tokenMeta}>{entry.tokenRef}</span>
                    <p className={styles.descriptionText}>{entry.description}</p>
                  </Stack>
                </Block>
              ))}
            </Grid>
          </Stack>
        </section>

        <section aria-labelledby="legend-symbols-heading" data-testid="legend-symbols-section">
          <Stack gap="loose">
            <Heading as="h2" id="legend-symbols-heading">
              Celestial Symbology
            </Heading>
            {LEGEND_SYMBOL_GROUPS.map((group) => (
              <Stack key={group.id} gap="tight">
                <Heading as="h3">{group.title}</Heading>
                <Grid as="ul" minWidth="sm" gap="tight">
                  {group.types.map((symbolType) => {
                    const meta = CELESTIAL_SYMBOL_META[symbolType];
                    return (
                      <Block
                        as="li"
                        padding="default"
                        key={symbolType}
                        data-testid="legend-symbol-item"
                        data-symbol-type={symbolType}
                      >
                        <Cluster gap="tight" align="center" justify="between">
                          <Cluster gap="tight" align="center">
                            <CelestialSymbol type={symbolType} size="md" showTooltip={false} />
                            <span className={styles.symbolTitle}>{meta.label}</span>
                          </Cluster>
                          {meta.defaultGuideHref ? (
                            <a
                              href={resolveAppHref(meta.defaultGuideHref)}
                              className={styles.symbolGuideLink}
                            >
                              Guide
                            </a>
                          ) : null}
                        </Cluster>
                      </Block>
                    );
                  })}
                </Grid>
              </Stack>
            ))}
          </Stack>
        </section>

        <section
          aria-labelledby="legend-chromaticity-heading"
          data-testid="legend-chromaticity-section"
        >
          <Stack gap="loose">
            <Heading as="h2" id="legend-chromaticity-heading">
              Chromaticity &amp; Observational Confidence
            </Heading>

            <Block padding="loose">
              <Stack gap="tight">
                <Heading as="h3">Spectral Classification Strip</Heading>
                <Cluster as="ul" gap="tight" align="center">
                  {LEGEND_SPECTRAL_CLASSES.map((spectralClass) => (
                    <li key={spectralClass}>
                      <SpectralBadge spectralType={spectralClass} interactive={false} />
                    </li>
                  ))}
                </Cluster>
              </Stack>
            </Block>

            <Block padding="loose">
              <Stack gap="tight">
                <Heading as="h3">Observational Confidence Indicators</Heading>
                <Cluster as="ul" gap="default" align="center">
                  {LEGEND_CONFIDENCE_LEVELS.map((level) => (
                    <li key={level}>
                      <Cluster gap="tight" align="center">
                        <ConfidencePip confidence={level} />
                        <span className={styles.confidenceLabel}>{level}</span>
                      </Cluster>
                    </li>
                  ))}
                </Cluster>
              </Stack>
            </Block>

            <Grid as="ul" minWidth="sm" gap="tight">
              {LEGEND_CHROMATIC_ENTRIES.map((entry) => (
                <Block
                  as="li"
                  padding="default"
                  key={entry.id}
                  data-testid="legend-swatch-item"
                  data-swatch-kind={entry.swatchKind}
                >
                  <Stack gap="tight">
                    <Cluster gap="tight" align="center">
                      <span
                        className={styles.colorSwatch}
                        data-swatch-kind={entry.swatchKind}
                        aria-hidden="true"
                      />
                      <span className={styles.symbolTitle}>{entry.title}</span>
                    </Cluster>
                    <span className={styles.tokenMeta}>{entry.tokenRef}</span>
                    <p className={styles.descriptionText}>{entry.description}</p>
                  </Stack>
                </Block>
              ))}
            </Grid>
          </Stack>
        </section>
      </Stack>
    </main>
  );
};
