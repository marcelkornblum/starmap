import React, { useMemo } from 'react';
import {
  buildPlanetaryOrbitalSchematic,
  buildSystemOrbitalSchematic,
  type BodiesPanelSummary,
  type OrbitalSchematicSummary,
} from '../../../services/detailsService';
import { Badge } from '../../interface/information';
import { OrbitalSchematicList } from '../OrbitalSchematicPanel/OrbitalSchematicPanel';
import styles from './BodiesPanel.module.css';

export interface BodiesPanelProps {
  readonly elements: BodiesPanelSummary | null;
  readonly schematic?: OrbitalSchematicSummary | null;
}

export const BodiesPanel: React.FC<BodiesPanelProps> = ({ elements, schematic }) => {
  const selectedEntityIds = elements?.selectedEntityIds;
  const selectedSet = useMemo(
    () => new Set(selectedEntityIds ?? []),
    [selectedEntityIds],
  );

  if (!elements) {
    return null;
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
