import React, { useMemo } from 'react';
import {
  buildPlanetaryOrbitalSchematic,
  buildSystemOrbitalSchematic,
  type BodiesPanelSummary,
  type OrbitalSchematicSummary,
} from '../../../services/detailsService';
import {
  Badge,
  CelestialBadge,
  Cluster,
  DataTable,
  HazardBadge,
  Heading,
  Quantity,
  SpectralBadge,
  Unit,
} from '../../interface';
import { OrbitalSchematicList } from '../OrbitalSchematicPanel/OrbitalSchematicPanel';
import styles from './BodiesPanel.module.css';

export interface BodiesPanelProps {
  readonly elements: BodiesPanelSummary | null;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly hoveredEntityId?: string | null;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

export const BodiesPanel: React.FC<BodiesPanelProps> = ({
  elements,
  schematic,
  hoveredEntityId,
  onHoverEntity,
}) => {
  const selectedEntityIds = elements?.selectedEntityIds;
  const selectedSet = useMemo(
    () => new Set(selectedEntityIds ?? []),
    [selectedEntityIds],
  );

  if (!elements) {
    return null;
  }

  if (elements.scope === 'galaxy') {
    const {
      centerId,
      apertureRadiusPc,
      focusedSystemId,
      focusedSystemName,
      systems,
    } = elements;

    return (
      <section
        aria-labelledby="bodies-panel-heading"
        data-testid="bodies-panel"
        data-scope="galaxy"
        data-center-id={centerId}
        data-aperture-radius-pc={apertureRadiusPc}
        className={styles.root}
      >
        <Heading as="h2" id="bodies-panel-heading" className={styles.heading}>
          Galactic Systems
        </Heading>

        {focusedSystemId && focusedSystemName ? (
          <p
            data-testid="bodies-distance-caption"
            className={styles.distanceCaption}
          >
            Distances from {focusedSystemName}
          </p>
        ) : null}

        <DataTable data-testid="bodies-galaxy-systems-list">
          <DataTable.Head>
            <DataTable.Row>
              <DataTable.HeaderCell>System</DataTable.HeaderCell>
              <DataTable.HeaderCell>Reticle</DataTable.HeaderCell>
              <DataTable.HeaderCell>Class</DataTable.HeaderCell>
              <DataTable.HeaderCell align="end">Planets</DataTable.HeaderCell>
              <DataTable.HeaderCell>Status</DataTable.HeaderCell>
              <DataTable.HeaderCell align="end">Distance</DataTable.HeaderCell>
            </DataTable.Row>
          </DataTable.Head>
          <DataTable.Body>
            {systems.map((sys) => {
              const isItemFocused = sys.tier === 'focused';
              const isItemSelected =
                sys.tier === 'selected' || selectedSet.has(sys.id);
              const isItemHovered =
                (hoveredEntityId ?? elements.hoveredEntityId) === sys.id;

              return (
                <DataTable.Row
                  key={sys.id}
                  data-testid="bodies-galaxy-system-item"
                  data-system-id={sys.id}
                  data-tier={sys.tier}
                  data-focused={isItemFocused ? 'true' : undefined}
                  data-selected={isItemSelected ? 'true' : undefined}
                  data-hovered={isItemHovered ? 'true' : undefined}
                  selected={isItemFocused || isItemSelected}
                  interactive
                  onMouseEnter={() => onHoverEntity?.(sys.id)}
                  onMouseLeave={() => onHoverEntity?.(null)}
                  onFocus={() => onHoverEntity?.(sys.id)}
                  onBlur={() => onHoverEntity?.(null)}
                >
                  <DataTable.Cell>
                    <a href={sys.href} data-testid="bodies-galaxy-system-link">
                      {sys.name}
                    </a>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <CelestialBadge type={sys.reticleType} data-testid="bodies-galaxy-system-reticle" />
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {sys.spectralType && sys.starTypeGuideHref ? (
                      <SpectralBadge
                        spectralType={sys.spectralType}
                        href={sys.starTypeGuideHref}
                        data-testid="bodies-galaxy-system-spectral-link"
                      />
                    ) : (
                      '—'
                    )}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Quantity
                      data-testid="bodies-galaxy-system-planets"
                      value={sys.planetCount}
                      unit={sys.planetCount === 1 ? 'planet' : 'planets'}
                    />
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Cluster gap="tight" align="center">
                      {sys.hasHabitableCandidate && sys.habitableZoneGuideHref ? (
                        <CelestialBadge
                          type="habitable-zone"
                          href={sys.habitableZoneGuideHref}
                          data-testid="bodies-galaxy-system-hz-link"
                        />
                      ) : null}
                      {sys.hazardCount > 0 ? (
                        <HazardBadge
                          label={sys.hazardSummaryLabel}
                          severity={sys.hasCriticalHazard ? 'critical' : 'caution'}
                          data-testid="bodies-galaxy-system-hazard"
                        />
                      ) : null}
                    </Cluster>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {sys.distanceFromFocusPc !== undefined ? (
                      sys.tier === 'focused' && sys.distanceFromFocusPc === 0 ? (
                        <Cluster
                          gap="tight"
                          align="center"
                          justify="end"
                          data-testid="bodies-focused-origin-badge"
                        >
                          <Badge status="info">Focused</Badge>
                          <Quantity value={0} unit="pc" />
                        </Cluster>
                      ) : (
                        <Cluster
                          gap="tight"
                          align="center"
                          justify="end"
                          data-testid="bodies-system-distance"
                        >
                          <Quantity
                            value={sys.distanceFromFocusPc}
                            unit={
                              <Unit>
                                {sys.distanceGuideHref ? (
                                  <a
                                    href={sys.distanceGuideHref}
                                    data-testid="bodies-distance-unit-link"
                                  >
                                    pc
                                  </a>
                                ) : (
                                  'pc'
                                )}
                              </Unit>
                            }
                          />
                          <Quantity value={sys.distanceFromFocusLy} unit="ly" />
                        </Cluster>
                      )
                    ) : (
                      '—'
                    )}
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable.Body>
        </DataTable>
      </section>
    );
  }

  const {
    scope,
    systemId,
    focusedEntityId,
    minorBodiesAndSpacecraft,
  } = elements;

  const resolvedSchematic =
    schematic ??
    (elements.scope === 'system'
      ? buildSystemOrbitalSchematic(elements)
      : buildPlanetaryOrbitalSchematic(elements));

  return (
    <section
      aria-labelledby="bodies-panel-heading"
      data-testid="bodies-panel"
      data-scope={scope}
      data-system-id={systemId}
      data-planet-id={scope === 'planet' ? elements.planetId : undefined}
      className={styles.root}
    >
      <Heading as="h2" id="bodies-panel-heading" className={styles.heading}>
        {scope === 'system' ? 'System Bodies' : 'Planetary Bodies'}
      </Heading>

      <section
        aria-labelledby="bodies-schematic-heading"
        data-testid="orbital-schematic-panel"
        data-scope={scope}
        data-system-id={systemId}
        data-planet-id={scope === 'planet' ? elements.planetId : undefined}
        className={styles.section}
      >
        <Heading as="h3" id="bodies-schematic-heading" className={styles.sectionHeading}>
          Orbital Schematic
        </Heading>
        {resolvedSchematic && resolvedSchematic.items.length > 0 ? (
          <OrbitalSchematicList items={resolvedSchematic.items} />
        ) : (
          <p data-testid="bodies-schematic-empty">No catalogued orbital bodies</p>
        )}
      </section>

      {minorBodiesAndSpacecraft.length > 0 ? (
        <section
          aria-labelledby="bodies-minor-bodies-heading"
          data-testid="bodies-minor-bodies-section"
          className={styles.section}
        >
          <Heading as="h3" id="bodies-minor-bodies-heading" className={styles.sectionHeading}>
            Minor Bodies &amp; Spacecraft
          </Heading>
          <DataTable data-testid="bodies-minor-bodies-list">
            <DataTable.Head>
              <DataTable.Row>
                <DataTable.HeaderCell>Body</DataTable.HeaderCell>
                <DataTable.HeaderCell>Classification</DataTable.HeaderCell>
              </DataTable.Row>
            </DataTable.Head>
            <DataTable.Body>
              {minorBodiesAndSpacecraft.map((body) => (
                <DataTable.Row
                  key={body.id}
                  data-testid="bodies-minor-body-item"
                  data-body-id={body.id}
                  data-focused={focusedEntityId === body.id ? 'true' : undefined}
                  data-selected={selectedSet.has(body.id) ? 'true' : undefined}
                >
                  <DataTable.Cell>
                    <a href={body.href} data-testid="bodies-minor-body-link">
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
      ) : null}
    </section>
  );
};
