import { Fragment, type ReactNode } from 'react';
import {
  buildSystemElementFocusHref,
  type EntityHazardItem,
  type FocusedCanonAnnotation,
  type FocusedDiskDetail,
  type FocusedEntityDetails,
  type FocusedPlanetDetail,
  type FocusedStarDetail,
  type SystemElementBodyItem,
  type SystemSummarySegment,
} from '../../../services/detailsService';
import {
  buildLayerGalaxyHref,
  buildMetricGuideHref,
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import {
  buildHazardGuideHref,
  HAZARDS_GUIDE_PATH,
} from '../../../services/guideService';
import { DetentSheet, type DetentLevel } from '../../interface/surfaces/DetentSheet';
import {
  Badge,
  Button,
  CelestialBadge,
  Cluster,
  ConfidencePip,
  type ConfidenceLevel,
  DataTable,
  Datum,
  HazardBadge,
  Heading,
  Quantity,
  SpectralBadge,
  Stack,
  Unit,
} from '../../interface';
import { PlanetCensus } from '../PlanetCensus';

export interface DetailsPanelProps {
  readonly details: FocusedEntityDetails | null;
  readonly activeDetent?: DetentLevel;
}

const renderSystemSummarySegments = (
  segments: readonly SystemSummarySegment[],
): ReactNode =>
  segments.map((seg, idx) => {
    if (seg.kind === 'spectral-badge') {
      return (
        <SpectralBadge
          key={idx}
          spectralType={seg.spectralType}
          href={buildStarTypeGuideHref(seg.spectralType)}
          fallback={seg.spectralType}
          data-testid="details-summary-spectral-link"
        />
      );
    }
    if (seg.kind === 'planet-type-badge') {
      return (
        <CelestialBadge
          key={idx}
          type={seg.composition}
          href={buildPlanetTypeGuideHref(seg.composition)}
          data-testid="details-summary-planet-type-link"
        />
      );
    }
    if (seg.kind === 'habitable-badge') {
      return (
        <CelestialBadge
          key={idx}
          type="habitable-zone"
          href={buildTagGalaxyHref('HabitableCandidate')}
          data-testid="details-summary-habitable-link"
        />
      );
    }
    return <Fragment key={idx}>{seg.text}</Fragment>;
  });

const renderCanonLayers = (
  canonAnnotations: readonly FocusedCanonAnnotation[],
): ReactNode => {
  if (canonAnnotations.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-canon-heading"
      data-testid="details-canon-section"
    >
      <Heading as="h4" size="eyebrow" id="details-canon-heading">
        Canon Layers
      </Heading>
      <ul data-testid="details-canon-list">
        {canonAnnotations.map((annotation) => (
          <li
            key={`${annotation.layerId}:${annotation.targetId}`}
            data-testid="details-canon-item"
            data-layer-id={annotation.layerId}
            data-layer-kind={annotation.kind}
            data-target-id={annotation.targetId}
          >
            <details data-testid="details-canon-accordion">
              <summary data-testid="details-canon-summary">
                {annotation.href ? (
                  <a
                    href={annotation.href}
                    data-testid="details-canon-item-link"
                  >
                    {annotation.inUniverseName || annotation.resolvedName ? (
                      <>
                        {`${annotation.layerTitle} — `}
                        <strong data-testid="details-canon-item-title">
                          {annotation.inUniverseName || annotation.resolvedName}
                        </strong>
                        {annotation.subtitle ? ` (${annotation.subtitle})` : null}
                      </>
                    ) : (
                      <>
                        {annotation.layerTitle}
                        {annotation.subtitle ? ` (${annotation.subtitle})` : null}
                      </>
                    )}
                  </a>
                ) : (
                  annotation.inUniverseName || annotation.resolvedName ? (
                    <>
                      <strong data-testid="details-canon-item-title">
                        {annotation.inUniverseName || annotation.resolvedName}
                      </strong>
                      {annotation.subtitle ? ` (${annotation.subtitle})` : null}
                      {' — '}
                    </>
                  ) : null
                )}
                {' '}
                <Badge
                  status={
                    annotation.kind === 'scientific-overlay'
                      ? 'info'
                      : 'neutral'
                  }
                  href={
                    annotation.layerHref ||
                    buildLayerGalaxyHref(annotation.layerId)
                  }
                  data-testid="details-canon-link"
                >
                  {annotation.layerTitle}
                </Badge>
              </summary>
              <p data-testid="details-canon-text">{annotation.text}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
};

const renderOrbitingBodies = (
  focusedKind: string,
  orbitingBodies?: readonly SystemElementBodyItem[],
): ReactNode => {
  if (
    (focusedKind !== 'planet' && focusedKind !== 'minor-body' && focusedKind !== 'belt') ||
    !orbitingBodies ||
    orbitingBodies.length === 0
  ) {
    return null;
  }
  const heading = focusedKind === 'belt' ? 'Resident Bodies' : 'Orbiting Bodies';
  return (
    <section
      aria-labelledby="details-orbiting-bodies-heading"
      data-testid="details-orbiting-bodies-section"
    >
      <Heading as="h4" size="eyebrow" id="details-orbiting-bodies-heading">
        {heading}
      </Heading>
      <DataTable data-testid="details-orbiting-bodies-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Body</DataTable.HeaderCell>
            <DataTable.HeaderCell>Category</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {orbitingBodies.map((body) => (
            <DataTable.Row
              key={body.id}
              data-testid="details-orbiting-body-item"
              data-body-id={body.id}
            >
              <DataTable.Cell>
                <a
                  href={body.href}
                  data-testid="details-orbiting-body-link"
                >
                  {body.name}
                </a>
              </DataTable.Cell>
              <DataTable.Cell>
                <CelestialBadge
                  type={
                    body.categoryKey === 'spacecraft'
                      ? 'construct'
                      : (body.categoryKey ?? 'asteroid')
                  }
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};

const renderHazards = (
  hazards: readonly EntityHazardItem[],
): ReactNode => (
  <section
    aria-labelledby="details-hazards-heading"
    data-testid="details-hazards-section"
  >
    <Heading as="h4" size="eyebrow" id="details-hazards-heading">
      Environmental Hazards
    </Heading>
    {hazards.length === 0 ? (
      <Stack gap="none" data-testid="details-hazards-nominal">
        <Datum
          label="Status"
          value="Nominal environment"
          unit={
            <Quantity
              value={0}
              unit={
                <Unit>
                  <a href={HAZARDS_GUIDE_PATH} data-testid="details-hazards-guide-link">
                    hazards
                  </a>
                </Unit>
              }
            />
          }
        />
      </Stack>
    ) : (
      <DataTable data-testid="details-hazards-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Hazard</DataTable.HeaderCell>
            <DataTable.HeaderCell>Operational Impact</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {hazards.map((hazard) => (
            <DataTable.Row
              key={hazard.code}
              data-testid="details-hazard-item"
              data-hazard-code={hazard.code}
              data-hazard-severity={hazard.severity}
            >
              <DataTable.Cell>
                <HazardBadge
                  code={hazard.code}
                  label={hazard.label}
                  severity={hazard.severity}
                  href={buildHazardGuideHref(hazard.code)}
                  data-testid="details-hazard-guide-link"
                />
              </DataTable.Cell>
              <DataTable.Cell>{hazard.description}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    )}
  </section>
);

const renderStars = (
  stars: readonly FocusedStarDetail[],
  systemNameOrId: string,
): ReactNode => {
  if (stars.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-stars-heading"
      data-testid="details-stars-section"
    >
      <Heading as="h4" size="eyebrow" id="details-stars-heading">
        Stars
      </Heading>
      <DataTable data-testid="details-stars-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Star</DataTable.HeaderCell>
            <DataTable.HeaderCell>Class</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Apparent Mag</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Absolute Mag</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {stars.map((star) => (
            <DataTable.Row
              key={star.id}
              data-testid="details-star-item"
              data-star-id={star.id}
            >
              <DataTable.Cell>
                <a
                  href={
                    star.href ??
                    buildSystemElementFocusHref(
                      systemNameOrId,
                      star.name || star.id,
                    )
                  }
                  data-testid="details-star-name-link"
                >
                  {star.name}
                </a>
              </DataTable.Cell>
              <DataTable.Cell>
                <SpectralBadge
                  spectralType={star.spectralType}
                  href={buildStarTypeGuideHref(star.spectralType)}
                  fallback={star.spectralType}
                  data-testid="details-star-spectral-link"
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Quantity
                  value={star.mag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude', star.id)}
                        data-testid="details-metric-unit-link"
                      >
                        V
                      </a>
                    </Unit>
                  }
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Quantity
                  value={star.absmag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude', star.id)}
                        data-testid="details-metric-unit-link"
                      >
                        M_V
                      </a>
                    </Unit>
                  }
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};

const renderPlanets = (
  planets: readonly FocusedPlanetDetail[],
  systemNameOrId: string,
): ReactNode => {
  if (planets.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-planets-heading"
      data-testid="details-planets-section"
    >
      <Heading as="h4" size="eyebrow" id="details-planets-heading">
        Planets
      </Heading>
      <DataTable data-testid="details-planets-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Planet</DataTable.HeaderCell>
            <DataTable.HeaderCell>Type</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">a</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">P</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Mass</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Temp</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {planets.map((planet) => (
            <DataTable.Row
              key={planet.id}
              data-testid="details-planet-item"
              data-planet-id={planet.id}
              data-composition={planet.composition}
            >
              <DataTable.Cell>
                <a
                  href={
                    planet.href ??
                    buildSystemElementFocusHref(
                      systemNameOrId,
                      planet.name || planet.id,
                    )
                  }
                  data-testid="details-planet-name-link"
                >
                  {planet.name}
                </a>
              </DataTable.Cell>
              <DataTable.Cell>
                <Cluster gap="tight" align="center">
                  <CelestialBadge
                    type={planet.composition}
                    href={buildPlanetTypeGuideHref(planet.composition)}
                    data-testid="details-planet-type-link"
                  />
                  {planet.isHabitableCandidate ? (
                    <CelestialBadge
                      type="habitable-zone"
                      href={buildTagGalaxyHref('HabitableCandidate')}
                      data-testid="details-planet-habitable-link"
                    />
                  ) : null}
                </Cluster>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.semiMajorAxisAu !== undefined ? (
                  <Quantity
                    value={planet.semiMajorAxisAu}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('semi-major-axis', planet.id)}
                          data-testid="details-metric-unit-link"
                        >
                          AU
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.periodDays !== undefined ? (
                  <Quantity
                    value={planet.periodDays}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('orbital-period', planet.id)}
                          data-testid="details-metric-unit-link"
                        >
                          d
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.massMearth !== undefined ? (
                  <Quantity
                    value={planet.massMearth}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('planetary-mass', planet.id)}
                          data-testid="details-metric-unit-link"
                        >
                          M⊕
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {planet.equilibriumTempK !== undefined ? (
                  <Quantity
                    value={planet.equilibriumTempK}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref(
                            'equilibrium-temperature',
                            planet.id,
                          )}
                          data-testid="details-metric-unit-link"
                        >
                          K
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};

const renderDisks = (
  disks: readonly FocusedDiskDetail[] | undefined,
  systemNameOrId: string,
): ReactNode => {
  if (!disks || disks.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="details-disks-heading"
      data-testid="details-disks-section"
    >
      <Heading as="h4" size="eyebrow" id="details-disks-heading">
        Circumstellar Belts & Disks
      </Heading>
      <DataTable data-testid="details-disks-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Belt / Disk</DataTable.HeaderCell>
            <DataTable.HeaderCell>Classification</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Span</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Temp</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {disks.map((disk) => (
            <DataTable.Row
              key={disk.id}
              data-testid="details-disk-item"
              data-disk-id={disk.id}
              data-kind={disk.kind}
            >
              <DataTable.Cell>
                <a
                  href={
                    disk.href ??
                    buildSystemElementFocusHref(
                      systemNameOrId,
                      disk.name || disk.id,
                    )
                  }
                  data-testid="details-disk-name-link"
                >
                  {disk.name}
                </a>
              </DataTable.Cell>
              <DataTable.Cell>
                <Cluster gap="tight" align="center">
                  <CelestialBadge type={disk.kind} />
                  {disk.confidence ? (
                    <ConfidencePip confidence={disk.confidence as ConfidenceLevel} size="sm" />
                  ) : null}
                </Cluster>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Quantity
                  value={`${disk.innerRadiusAu}–${disk.outerRadiusAu}`}
                  unit={
                    <Unit>
                      <a
                        href={disk.guideHref}
                        data-testid="details-disk-unit-link"
                      >
                        AU
                      </a>
                    </Unit>
                  }
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {disk.tempK !== undefined ? (
                  <Quantity
                    value={disk.tempK}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref('equilibrium-temperature', disk.id)}
                          data-testid="details-disk-temp-link"
                        >
                          K
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};

/**
 * Domain Component (`<DetailsPanel>`): accepts a single `FocusedEntityDetails | null`
 * domain property (`details`), returns `null` when nothing is focused, and decomposes
 * the focused entity's data into the 3 detent areas (`Peek`, `Partial`, `Full`).
 */
export const DetailsPanel = ({ details, activeDetent }: DetailsPanelProps) => {
  if (!details) {
    return null;
  }

  const {
    id,
    systemId,
    name,
    systemName,
    focusedKind,
    spectralType,
    reticleType,
    starCount,
    planetCount,
    planetCompositionBreakdown,
    hasHabitableCandidate,
    systemSummarySegments,
    coordinatesPc,
    sectorId,
    tags,
    systemDetailsHref,
    starTelemetry,
    planetTelemetry,
    diskTelemetry,
    minorBodyTelemetry,
    structureTelemetry,
    stars,
    planets,
    orbitingBodies,
    canonAnnotations,
  } = details;

  const isSystemFocus = focusedKind === 'system';

  const hazardBadgeStatus: 'critical' | 'caution' | 'nominal' =
    details.hazardCount > 0
      ? details.hazards.some((h) => h.severity === 'critical')
        ? 'critical'
        : 'caution'
      : 'nominal';

  const hazardSummaryNode =
    details.hazardCount === 0 ? (
      <span data-testid="details-hazard-summary">
        <Quantity
          value={0}
          unit={
            <Unit>
              <a
                href={HAZARDS_GUIDE_PATH}
                data-testid="details-hazard-summary-link"
              >
                hazards
              </a>
            </Unit>
          }
        />
      </span>
    ) : (
      <span data-testid="details-hazard-summary">
        <HazardBadge
          label={details.hazardSummaryLabel}
          severity={hazardBadgeStatus === 'critical' ? 'critical' : 'caution'}
          href={
            details.hazards.length === 1
              ? buildHazardGuideHref(details.hazards[0]?.code)
              : HAZARDS_GUIDE_PATH
          }
          data-testid="details-hazard-summary-link"
        />
      </span>
    );

  const peekContent = (
    <>
      <Cluster gap="tight" align="center" data-testid="details-peek-header">
        <strong data-testid="details-peek-name">{name}</strong>
        {name !== systemName ? (
          <Badge status="neutral" data-testid="details-peek-system-name">
            {systemName}
          </Badge>
        ) : null}
        <CelestialBadge type={reticleType} data-testid="details-reticle-type" />
        {(isSystemFocus || focusedKind === 'star') && spectralType ? (
          <SpectralBadge
            spectralType={spectralType}
            href={buildStarTypeGuideHref(spectralType)}
            data-testid="details-spectral-badge"
          />
        ) : null}
        {isSystemFocus ? (
          <Quantity
            data-testid="details-star-count"
            value={starCount}
            unit={starCount === 1 ? 'star' : 'stars'}
          />
        ) : null}
      </Cluster>
      {planetTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Classification"
            value={
              <Cluster gap="tight" align="center">
                <CelestialBadge
                  type={planetTelemetry.composition}
                  href={buildPlanetTypeGuideHref(planetTelemetry.composition)}
                  data-testid="details-planet-type-link"
                />
                {planetTelemetry.isHabitableCandidate ? (
                  <CelestialBadge
                    type="habitable-zone"
                    href={buildTagGalaxyHref('HabitableCandidate')}
                    data-testid="details-planet-habitable-link"
                  />
                ) : null}
              </Cluster>
            }
          />
          {planetTelemetry.semiMajorAxisAu !== undefined ? (
            <Datum
              label="Semi-Major Axis (a)"
              value={planetTelemetry.semiMajorAxisAu}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('semi-major-axis', id)}
                    data-testid="details-metric-unit-link"
                  >
                    AU
                  </a>
                </Unit>
              }
            />
          ) : null}
          {planetTelemetry.periodDays !== undefined ? (
            <Datum
              label="Orbital Period (P)"
              value={planetTelemetry.periodDays}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('orbital-period', id)}
                    data-testid="details-metric-unit-link"
                  >
                    d
                  </a>
                </Unit>
              }
            />
          ) : null}
          {planetTelemetry.massMearth !== undefined ? (
            <Datum
              label="Mass"
              value={planetTelemetry.massMearth}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('planetary-mass', id)}
                    data-testid="details-metric-unit-link"
                  >
                    M⊕
                  </a>
                </Unit>
              }
            />
          ) : null}
          {planetTelemetry.equilibriumTempK !== undefined ? (
            <Datum
              label="Equilibrium Temp"
              value={planetTelemetry.equilibriumTempK}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('equilibrium-temperature', id)}
                    data-testid="details-metric-unit-link"
                  >
                    K
                  </a>
                </Unit>
              }
            />
          ) : null}
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {starTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Component"
            value={`Component ${starTelemetry.componentDesignation}`}
          />
          <Datum
            label="Apparent Magnitude"
            value={starTelemetry.mag}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('stellar-magnitude', id)}
                  data-testid="details-metric-unit-link"
                >
                  V
                </a>
              </Unit>
            }
          />
          <Datum
            label="Absolute Magnitude"
            value={starTelemetry.absmag}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('stellar-magnitude', id)}
                  data-testid="details-metric-unit-link"
                >
                  M_V
                </a>
              </Unit>
            }
          />
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {minorBodyTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Classification"
            value={<CelestialBadge type={minorBodyTelemetry.classification} showLabel />}
          />
          {minorBodyTelemetry.parentBodyName ? (
            <Datum
              label="Parent Body"
              value={minorBodyTelemetry.parentBodyName}
            />
          ) : null}
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {structureTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Structure Type"
            value={
              <Cluster gap="tight" align="center">
                <CelestialBadge type={structureTelemetry.symbolType} />
                <Badge status="info">{structureTelemetry.structureType}</Badge>
              </Cluster>
            }
          />
        </Stack>
      ) : null}
      {diskTelemetry ? (
        <Stack gap="none" data-testid="details-focused-entity-peek">
          <Datum
            label="Classification"
            value={
              <CelestialBadge
                type={diskTelemetry.classification}
                href={buildMetricGuideHref('semi-major-axis', id)}
                data-testid="details-disk-classification-link"
              />
            }
          />
          <Datum
            label="Radial Span"
            value={`${diskTelemetry.innerRadiusAu}–${diskTelemetry.outerRadiusAu}`}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('semi-major-axis', id)}
                  data-testid="details-metric-unit-link"
                >
                  AU
                </a>
              </Unit>
            }
          />
          {diskTelemetry.tempK !== undefined ? (
            <Datum
              label="Estimated Temp"
              value={diskTelemetry.tempK}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('equilibrium-temperature', id)}
                    data-testid="details-metric-unit-link"
                  >
                    K
                  </a>
                </Unit>
              }
            />
          ) : null}
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      {isSystemFocus ? (
        <Stack gap="none">
          <Datum
            data-testid="details-planet-composition"
            label="Planets"
            value={
              <PlanetCensus
                planetCount={planetCount}
                breakdown={planetCompositionBreakdown}
                hasHabitableCandidate={hasHabitableCandidate}
                habitableHref={buildTagGalaxyHref('HabitableCandidate')}
                planetTypeHrefBuilder={buildPlanetTypeGuideHref}
                planetTypeTestId="details-summary-planet-type-link"
                habitableTestId="details-habitable-zone-link"
              />
            }
          />
          <Datum label="Hazards" value={hazardSummaryNode} />
        </Stack>
      ) : null}
      <p data-testid="details-system-summary">
        {renderSystemSummarySegments(systemSummarySegments)}
      </p>
    </>
  );

  const partialContent = (
    <>
      <Cluster gap="default" data-testid="details-cta-group">
        {systemDetailsHref ? (
          <Button
            href={systemDetailsHref}
            variant="default"
            data-testid="details-button-system-details"
          >
            Details
          </Button>
        ) : null}
        <Button
          href={
            details.centerHref ??
            `/galaxy?center=${encodeURIComponent(id)}&focus=${encodeURIComponent(id)}`
          }
          variant="default"
          data-testid="details-button-center"
        >
          Centre
        </Button>
        <Button
          href={details.directionsHref}
          variant="primary"
          data-testid="details-button-directions"
        >
          Directions
        </Button>
      </Cluster>
      {renderHazards(details.hazards)}
      {renderCanonLayers(canonAnnotations)}
      {renderOrbitingBodies(focusedKind, orbitingBodies)}
      {isSystemFocus ? renderStars(stars, systemName || systemId) : null}
      {isSystemFocus ? renderPlanets(planets, systemName || systemId) : null}
      {isSystemFocus ? renderDisks(details.disks, systemName || systemId) : null}
    </>
  );

  const fullContent = (
    <>
      {starTelemetry ? (
        <section
          aria-labelledby="details-star-telemetry-heading"
          data-testid="details-star-telemetry-section"
        >
          <Heading as="h4" size="eyebrow" id="details-star-telemetry-heading">
            Stellar Telemetry
          </Heading>
          <Stack gap="none" data-testid="details-star-telemetry-list">
            <Datum
              label="Component"
              valueTestId="details-star-telemetry-component"
              value={starTelemetry.componentDesignation}
            />
            <Datum
              label="Spectral Class"
              valueTestId="details-star-telemetry-spectral"
              value={
                <SpectralBadge
                  spectralType={starTelemetry.spectralType}
                  href={buildStarTypeGuideHref(starTelemetry.spectralType)}
                  fallback={starTelemetry.spectralType}
                  data-testid="details-star-telemetry-spectral-link"
                />
              }
            />
            <Datum
              label="Apparent Magnitude"
              valueTestId="details-star-telemetry-mag"
              value={starTelemetry.mag}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('stellar-magnitude', id)}
                    data-testid="details-metric-unit-link"
                  >
                    V
                  </a>
                </Unit>
              }
            />
            <Datum
              label="Absolute Magnitude"
              valueTestId="details-star-telemetry-absmag"
              value={starTelemetry.absmag}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('stellar-magnitude', id)}
                    data-testid="details-metric-unit-link"
                  >
                    M_V
                  </a>
                </Unit>
              }
            />
            {starTelemetry.massMsun !== undefined ? (
              <Datum
                label="Mass"
                valueTestId="details-star-telemetry-mass"
                value={starTelemetry.massMsun}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('stellar-mass', id)}
                      data-testid="details-metric-unit-link"
                    >
                      M☉
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {starTelemetry.radiusRsun !== undefined ? (
              <Datum
                label="Radius"
                valueTestId="details-star-telemetry-radius"
                value={starTelemetry.radiusRsun}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('stellar-radius', id)}
                      data-testid="details-metric-unit-link"
                    >
                      R☉
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {starTelemetry.luminosityLsun !== undefined ? (
              <Datum
                label="Luminosity"
                valueTestId="details-star-telemetry-luminosity"
                value={starTelemetry.luminosityLsun}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('stellar-luminosity', id)}
                      data-testid="details-metric-unit-link"
                    >
                      L☉
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {starTelemetry.effectiveTempK !== undefined ? (
              <Datum
                label="Effective Temp"
                valueTestId="details-star-telemetry-temp"
                value={starTelemetry.effectiveTempK}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('effective-temperature', id)}
                      data-testid="details-metric-unit-link"
                    >
                      K
                    </a>
                  </Unit>
                }
              />
            ) : null}
          </Stack>
        </section>
      ) : null}
      {planetTelemetry ? (
        <section
          aria-labelledby="details-planet-telemetry-heading"
          data-testid="details-planet-telemetry-section"
        >
          <Heading as="h4" size="eyebrow" id="details-planet-telemetry-heading">
            Planetary Telemetry
          </Heading>
          <Stack gap="none" data-testid="details-planet-telemetry-list">
            <Datum
              label="Composition"
              valueTestId="details-planet-telemetry-composition"
              value={
                <CelestialBadge
                  type={planetTelemetry.composition}
                  href={buildPlanetTypeGuideHref(planetTelemetry.composition)}
                  data-testid="details-planet-telemetry-type-link"
                />
              }
            />
            <Datum
              data-testid="details-planet-telemetry-habitable"
              label="Habitability"
              valueTestId="details-planet-telemetry-habitability"
              value={
                planetTelemetry.isHabitableCandidate ? (
                  <CelestialBadge
                    type="habitable-zone"
                    href="/guide/planet-types/habitable-zone"
                    data-testid="details-planet-telemetry-habitable-link"
                  />
                ) : (
                  'Outside optimistic zone'
                )
              }
            />
            {planetTelemetry.semiMajorAxisAu !== undefined ? (
              <Datum
                label="Semi-Major Axis (a)"
                valueTestId="details-planet-telemetry-axis"
                value={planetTelemetry.semiMajorAxisAu}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('semi-major-axis', id)}
                      data-testid="details-metric-unit-link"
                    >
                      AU
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {planetTelemetry.periodDays !== undefined ? (
              <Datum
                label="Orbital Period (P)"
                valueTestId="details-planet-telemetry-period"
                value={planetTelemetry.periodDays}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('orbital-period', id)}
                      data-testid="details-metric-unit-link"
                    >
                      d
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {planetTelemetry.eccentricity !== undefined ? (
              <Datum
                label="Eccentricity"
                valueTestId="details-planet-telemetry-eccentricity"
                value={planetTelemetry.eccentricity}
              />
            ) : null}
            {planetTelemetry.inclinationDeg !== undefined ? (
              <Datum
                label="Inclination (i)"
                valueTestId="details-planet-telemetry-inclination"
                value={planetTelemetry.inclinationDeg}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('orbital-inclination', id)}
                      data-testid="details-metric-unit-link"
                    >
                      °
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {planetTelemetry.massMearth !== undefined ? (
              <Datum
                label="Mass"
                valueTestId="details-planet-telemetry-mass"
                value={planetTelemetry.massMearth}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('planetary-mass', id)}
                      data-testid="details-metric-unit-link"
                    >
                      M⊕
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {planetTelemetry.radiusRearth !== undefined ? (
              <Datum
                label="Radius"
                valueTestId="details-planet-telemetry-radius"
                value={planetTelemetry.radiusRearth}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('planetary-radius', id)}
                      data-testid="details-metric-unit-link"
                    >
                      R⊕
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {planetTelemetry.surfaceGravityG !== undefined ? (
              <Datum
                label="Surface Gravity"
                valueTestId="details-planet-telemetry-gravity"
                value={planetTelemetry.surfaceGravityG}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('surface-gravity', id)}
                      data-testid="details-metric-unit-link"
                    >
                      g
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {planetTelemetry.equilibriumTempK !== undefined ? (
              <Datum
                label="Equilibrium Temp"
                valueTestId="details-planet-telemetry-temp"
                value={planetTelemetry.equilibriumTempK}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref(
                        'equilibrium-temperature',
                        id,
                      )}
                      data-testid="details-metric-unit-link"
                    >
                      K
                    </a>
                  </Unit>
                }
              />
            ) : null}
            {planetTelemetry.esi !== undefined ? (
              <Datum
                label="Earth Similarity Index (ESI)"
                valueTestId="details-planet-telemetry-esi"
                value={planetTelemetry.esi.toFixed(2)}
              />
            ) : null}
            <Datum
              data-testid="details-planet-telemetry-tidal-status"
              label="Tidal Status"
              valueTestId="details-planet-telemetry-tidal"
              value={
                planetTelemetry.isTidallyLocked ? (
                  <Badge status="caution">
                    Tidally locked (synchronous)
                  </Badge>
                ) : (
                  'Free rotation'
                )
              }
            />
            {planetTelemetry.discoveryYear !== undefined ||
            planetTelemetry.discoveryMethod ? (
              <Datum
                label="Discovery"
                valueTestId="details-planet-telemetry-discovery"
                value={[
                  planetTelemetry.discoveryYear,
                  planetTelemetry.discoveryMethod,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ) : null}
          </Stack>
        </section>
      ) : null}
      {diskTelemetry ? (
        <section
          aria-labelledby="details-disk-telemetry-heading"
          data-testid="details-disk-telemetry-section"
        >
          <Heading as="h4" size="eyebrow" id="details-disk-telemetry-heading">
            Circumstellar Disk Telemetry
          </Heading>
          <Stack gap="none" data-testid="details-disk-telemetry-list">
            <Datum
              label="Classification"
              valueTestId="details-disk-telemetry-classification"
              value={
                <CelestialBadge
                  type={diskTelemetry.classification}
                  href={buildMetricGuideHref('semi-major-axis', id)}
                  data-testid="details-disk-classification-link"
                />
              }
            />
            {diskTelemetry.confidence ? (
              <Datum
                label="Observational Confidence"
                valueTestId="details-disk-telemetry-confidence"
                confidence={diskTelemetry.confidence as ConfidenceLevel}
                value={
                  <Badge confidence={diskTelemetry.confidence as any}>
                    {diskTelemetry.confidence}
                  </Badge>
                }
              />
            ) : null}
            <Datum
              label="Radial Span"
              valueTestId="details-disk-telemetry-span"
              value={`${diskTelemetry.innerRadiusAu}–${diskTelemetry.outerRadiusAu}`}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('semi-major-axis', id)}
                    data-testid="details-metric-unit-link"
                  >
                    AU
                  </a>
                </Unit>
              }
            />
            <Datum
              label="Midpoint Radius"
              valueTestId="details-disk-telemetry-midpoint"
              value={diskTelemetry.semiMajorAxisAu}
              unit={
                <Unit>
                  <a
                    href={buildMetricGuideHref('semi-major-axis', id)}
                    data-testid="details-metric-unit-link"
                  >
                    AU
                  </a>
                </Unit>
              }
            />
            {diskTelemetry.tempK !== undefined ? (
              <Datum
                label="Estimated Temp"
                valueTestId="details-disk-telemetry-temp"
                value={diskTelemetry.tempK}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref(
                        'equilibrium-temperature',
                        id,
                      )}
                      data-testid="details-metric-unit-link"
                    >
                      K
                    </a>
                  </Unit>
                }
              />
            ) : null}
            <Datum
              label="Composition"
              valueTestId="details-disk-telemetry-composition"
              value={diskTelemetry.composition}
            />
          </Stack>
        </section>
      ) : null}
      {minorBodyTelemetry ? (
        <section
          aria-labelledby="details-minor-body-telemetry-heading"
          data-testid="details-minor-body-telemetry-section"
        >
          <Heading as="h4" size="eyebrow" id="details-minor-body-telemetry-heading">
            Body Telemetry
          </Heading>
          <Stack gap="none" data-testid="details-minor-body-telemetry-list">
            <Datum
              label="Classification"
              valueTestId="details-minor-body-telemetry-class"
              value={
                <CelestialBadge
                  type={minorBodyTelemetry.classification}
                  showLabel
                />
              }
            />
            {minorBodyTelemetry.parentBodyName ? (
              <Datum
                label="Host System"
                valueTestId="details-minor-body-telemetry-parent"
                value={minorBodyTelemetry.parentBodyName}
              />
            ) : null}
          </Stack>
        </section>
      ) : null}
      {structureTelemetry ? (
        <section
          aria-labelledby="details-structure-telemetry-heading"
          data-testid="details-structure-telemetry-section"
        >
          <Heading as="h4" size="eyebrow" id="details-structure-telemetry-heading">
            Structure Telemetry
          </Heading>
          <Stack gap="none" data-testid="details-structure-telemetry-list">
            <Datum
              label="Structure Type"
              valueTestId="details-structure-telemetry-type"
              value={
                <Cluster gap="tight" align="center">
                  <CelestialBadge type={structureTelemetry.symbolType} />
                  <Badge status="info">{structureTelemetry.structureType}</Badge>
                </Cluster>
              }
            />
            {structureTelemetry.radiusPc !== undefined ? (
              <Datum
                label="Radius"
                valueTestId="details-structure-telemetry-radius"
                value={structureTelemetry.radiusPc}
                unit={
                  <Unit>
                    <a
                      href={buildMetricGuideHref('galactic-coordinates', id)}
                      data-testid="details-metric-unit-link"
                    >
                      pc
                    </a>
                  </Unit>
                }
              />
            ) : null}
          </Stack>
        </section>
      ) : null}
      <section
        aria-labelledby="details-astrometry-heading"
        data-testid="details-astrometry-section"
      >
        <Heading as="h4" size="eyebrow" id="details-astrometry-heading">
          Astrometry
        </Heading>
        <Stack gap="none" data-testid="details-astrometry-list">
          <Datum
            label="System ID"
            valueTestId="details-astrometry-system-id"
            value={systemId}
          />
          <Datum
            label="Sector"
            valueTestId="details-astrometry-sector"
            value={sectorId}
          />
          <Datum
            label="Coordinates (J2000 pc)"
            valueTestId="details-astrometry-coords"
            value={`${coordinatesPc[0]}, ${coordinatesPc[1]}, ${coordinatesPc[2]}`}
            unit={
              <Unit>
                <a
                  href={buildMetricGuideHref('galactic-coordinates', id)}
                  data-testid="details-metric-unit-link"
                >
                  pc
                </a>
              </Unit>
            }
          />
          {tags.length > 0 ? (
            <Datum
              label="Tags"
              valueTestId="details-astrometry-tags"
              value={
                <>
                  {tags.map((tag, index) => (
                    <Fragment key={tag}>
                      {index > 0 ? ' ' : null}
                      <Badge
                        status={
                          tag === 'HabitableCandidate'
                            ? 'nominal'
                            : 'neutral'
                        }
                      >
                        <a
                          href={buildTagGalaxyHref(tag)}
                          data-testid="details-astrometry-tag-link"
                        >
                          {tag}
                        </a>
                      </Badge>
                    </Fragment>
                  ))}
                </>
              }
            />
          ) : null}
        </Stack>
      </section>
    </>
  );

  return (
    <DetentSheet
      testIdPrefix="details"
      heading="Details"
      headingId="details-panel-heading"
      activeDetent={activeDetent}
      data-entity-id={id}
      data-system-id={systemId}
      data-focused-kind={focusedKind}
      peek={peekContent}
      partial={partialContent}
      full={fullContent}
    />
  );
};
