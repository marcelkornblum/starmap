import type React from 'react';
import { GuideSectionNav } from '../components/domain/GuideSectionNav';
import { SpatialShell } from '../components/domain/SpatialShell';
import symbologyStyles from '../components/domain/OrbitalSchematicPanel/schematicSymbology.module.css';
import {
  Badge,
  Block,
  CELESTIAL_SYMBOL_META,
  CelestialSymbol,
  Cluster,
  CollapsibleSection,
  ConfidencePip,
  Grid,
  Heading,
  Stack,
} from '../components/interface';
import {
  LEGEND_CHROMATIC_ENTRIES,
  LEGEND_CONFIDENCE_LEVELS,
  LEGEND_LINE_ENTRIES,
  LEGEND_SPECTRAL_CLASSES,
  LEGEND_SYMBOL_GROUPS,
  LEGEND_ZONE_ENTRIES,
} from '../content/guide';
import { useSpaLinkClick } from '../hooks/spaNavigation';
import { resolveAppHref } from '../utils/url';
import guideStyles from './GuideViews.module.css';
import styles from './LegendGuideView.module.css';

export const LegendGuideView: React.FC = () => {
  const handleSpaLinkClick = useSpaLinkClick();

  return (
    <SpatialShell
      mode="document"
      testId="legend-guide-view-root"
      activeWorkspace="guide"
    >
      <div className={guideStyles.guideRoot}>
      <GuideSectionNav currentSection="legend" />
      <Heading as="h1" size="title">Cartography &amp; Symbology</Heading>

      <Stack gap="section">
        <CollapsibleSection
          title="Lines & Trajectories"
          headingAs="h2"
          headingId="legend-lines-heading"
          data-testid="legend-lines-section"
        >
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
                      className={symbologyStyles.trackLine}
                      data-line-style={
                        entry.id === 'theoretical-orbit'
                          ? 'dotted'
                          : entry.id === 'datum-plane'
                            ? 'solid'
                            : entry.id === 'route-chord'
                              ? 'route'
                              : 'dashed'
                      }
                      data-kinematic={entry.id === 'kinematic-highlight' ? 'true' : undefined}
                      aria-hidden="true"
                    />
                  </span>
                  <Cluster gap="tight" align="center" justify="between">
                    <span className={styles.symbolTitle}>{entry.title}</span>
                    <Badge status="neutral">{entry.patternLabel}</Badge>
                  </Cluster>
                  <span className={styles.roleMeta}>{entry.roleLabel}</span>
                  <p className={styles.descriptionText}>{entry.description}</p>
                </Stack>
              </Block>
            ))}
          </Grid>
        </CollapsibleSection>

        <CollapsibleSection
          title="Zones & Thermal Boundaries"
          headingAs="h2"
          headingId="legend-zones-heading"
          data-testid="legend-zones-section"
        >
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
                  <span className={styles.zoneSwatchStage} aria-hidden="true">
                    <span
                      className={symbologyStyles.zoneBand}
                      data-region-kind={entry.regionKind}
                      data-swatch="true"
                      aria-hidden="true"
                    />
                  </span>
                  <span className={styles.symbolTitle}>{entry.title}</span>
                  <span className={styles.roleMeta}>{entry.roleLabel}</span>
                  <p className={styles.descriptionText}>{entry.description}</p>
                </Stack>
              </Block>
            ))}
          </Grid>
        </CollapsibleSection>

        <CollapsibleSection
          title="Celestial Symbology"
          headingAs="h2"
          headingId="legend-symbols-heading"
          data-testid="legend-symbols-section"
        >
          <Stack gap="loose">
            {LEGEND_SYMBOL_GROUPS.map((group) => (
              <CollapsibleSection key={group.id} title={group.title} headingAs="h3">
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
                              data-testid="legend-symbol-guide-link"
                              onClick={(e) => {
                                handleSpaLinkClick(e, meta.defaultGuideHref);
                              }}
                            >
                              Guide
                            </a>
                          ) : null}
                        </Cluster>
                      </Block>
                    );
                  })}
                </Grid>
              </CollapsibleSection>
            ))}
          </Stack>
        </CollapsibleSection>

        <CollapsibleSection
          title="Chromaticity & Observational Confidence"
          headingAs="h2"
          headingId="legend-chromaticity-heading"
          data-testid="legend-chromaticity-section"
        >
          <Stack gap="loose">
            <Block padding="loose">
              <Stack gap="tight">
                <Heading as="h3">Spectral Classification Strip</Heading>
                <Cluster as="ul" gap="tight" align="center">
                  {LEGEND_SPECTRAL_CLASSES.map((spectralClass) => (
                    <Block
                      as="li"
                      padding="tight"
                      key={spectralClass}
                      data-testid="legend-spectral-item"
                      data-spectral-class={spectralClass}
                    >
                      <Cluster gap="tight" align="center">
                        <span
                          className={styles.spectralSwatch}
                          data-spectral-class={spectralClass}
                          aria-hidden="true"
                        />
                        <span className={styles.spectralLabel}>{spectralClass}</span>
                      </Cluster>
                    </Block>
                  ))}
                </Cluster>
              </Stack>
            </Block>

            <Block padding="loose">
              <Stack gap="tight">
                <Heading as="h3">Observational Confidence Indicators</Heading>
                <Cluster as="ul" gap="default" align="center">
                  {LEGEND_CONFIDENCE_LEVELS.map((level) => (
                    <li key={level} data-testid="legend-confidence-item" data-confidence={level}>
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
                    <span className={styles.roleMeta}>{entry.roleLabel}</span>
                    <p className={styles.descriptionText}>{entry.description}</p>
                  </Stack>
                </Block>
              ))}
            </Grid>
          </Stack>
        </CollapsibleSection>
      </Stack>
      </div>
    </SpatialShell>
  );
};
