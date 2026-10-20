import React, { useMemo } from 'react';
import {
  buildPlanetaryOrbitalSchematic,
  buildSystemOrbitalSchematic,
  type BodiesPanelSummary,
  type OrbitalSchematicSummary,
} from '../../../services/detailsService';
import { Badge, Quantity, Unit } from '../../interface/information';
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
        <h2 id="bodies-panel-heading" className={styles.heading}>
          Galactic Systems
        </h2>

        {focusedSystemId && focusedSystemName ? (
          <p
            data-testid="bodies-distance-caption"
            className={styles.distanceCaption}
          >
            Distances from {focusedSystemName}
          </p>
        ) : null}

        <ul
          data-testid="bodies-galaxy-systems-list"
          className={styles.systemsList}
        >
          {systems.map((sys) => {
            const isItemFocused = sys.tier === 'focused';
            const isItemSelected =
              sys.tier === 'selected' || selectedSet.has(sys.id);
            const isItemHovered =
              (hoveredEntityId ?? elements.hoveredEntityId) === sys.id;

            return (
              <li
                key={sys.id}
                data-testid="bodies-galaxy-system-item"
                data-system-id={sys.id}
                data-tier={sys.tier}
                data-focused={isItemFocused ? 'true' : undefined}
                data-selected={isItemSelected ? 'true' : undefined}
                data-hovered={isItemHovered ? 'true' : undefined}
                onMouseEnter={() => onHoverEntity?.(sys.id)}
                onMouseLeave={() => onHoverEntity?.(null)}
                className={styles.systemItem}
              >
                <a href={sys.href} data-testid="bodies-galaxy-system-link">
                  {sys.name}
                </a>{' '}
                <span data-testid="bodies-galaxy-system-reticle">
                  [{sys.reticleType}]
                </span>{' '}
                {sys.spectralType && sys.starTypeGuideHref ? (
                  <Badge category="star">
                    <a
                      href={sys.starTypeGuideHref}
                      data-testid="bodies-galaxy-system-spectral-link"
                    >
                      {sys.spectralType}
                    </a>
                  </Badge>
                ) : null}{' '}
                <span data-testid="bodies-galaxy-system-planets">
                  {sys.planetCount === 1
                    ? '1 planet'
                    : `${sys.planetCount} planets`}
                </span>{' '}
                {sys.hasHabitableCandidate && sys.habitableZoneGuideHref ? (
                  <Badge status="nominal">
                    <a
                      href={sys.habitableZoneGuideHref}
                      data-testid="bodies-galaxy-system-hz-link"
                    >
                      Habitable Zone
                    </a>
                  </Badge>
                ) : null}{' '}
                {sys.hazardCount > 0 ? (
                  <Badge
                    status={sys.hasCriticalHazard ? 'critical' : 'caution'}
                    data-testid="bodies-galaxy-system-hazard"
                  >
                    {sys.hazardSummaryLabel}
                  </Badge>
                ) : null}{' '}
                {sys.distanceFromFocusPc !== undefined ? (
                  sys.tier === 'focused' && sys.distanceFromFocusPc === 0 ? (
                    <Badge
                      status="info"
                      data-testid="bodies-focused-origin-badge"
                    >
                      Focused (0 pc)
                    </Badge>
                  ) : (
                    <span data-testid="bodies-system-distance">
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
                      />{' '}
                      ({sys.distanceFromFocusLy} ly)
                    </span>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
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
      <h2 id="bodies-panel-heading" className={styles.heading}>
        {scope === 'system' ? 'System Bodies' : 'Planetary Bodies'}
      </h2>

      <section
        aria-labelledby="bodies-schematic-heading"
        data-testid="orbital-schematic-panel"
        data-scope={scope}
        data-system-id={systemId}
        data-planet-id={scope === 'planet' ? elements.planetId : undefined}
        className={styles.section}
      >
        <h3 id="bodies-schematic-heading" className={styles.sectionHeading}>
          Orbital Schematic
        </h3>
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
          <h3 id="bodies-minor-bodies-heading" className={styles.sectionHeading}>
            Minor Bodies &amp; Spacecraft
          </h3>
          <ul
            data-testid="bodies-minor-bodies-list"
            className={styles.minorBodiesList}
          >
            {minorBodiesAndSpacecraft.map((body) => (
              <li
                key={body.id}
                data-testid="bodies-minor-body-item"
                data-body-id={body.id}
                data-focused={focusedEntityId === body.id ? 'true' : undefined}
                data-selected={selectedSet.has(body.id) ? 'true' : undefined}
                className={styles.minorBodyItem}
              >
                <a href={body.href} data-testid="bodies-minor-body-link">
                  {body.name}
                </a>{' '}
                <Badge status="neutral">{body.categoryLabel}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
};
